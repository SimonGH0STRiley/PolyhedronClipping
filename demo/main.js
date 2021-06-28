"use strict";

async function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl', {stencil: true});
	if (!gl) {
		alert('浏览器不支持WebGL 请升级浏览器');
		return;
	}

	// Object vertex shader program with illumination
	const objectLightVS = `
		attribute vec4 a_position;
		attribute vec3 a_normal;
		
		uniform mat4 u_modelViewProjectionMatrix;
		uniform mat3 u_normalMatrix;
		
		varying highp vec3 v_normal;
		
		void main() {
			gl_Position = u_modelViewProjectionMatrix * a_position;
			v_normal = u_normalMatrix * a_normal;
		}
	`;
	// Object fragment shader program with illumination
	const objectLightFS = `
		precision highp float;
		
		uniform vec4 u_color;
		uniform vec3 u_lightPosition;

		varying highp vec3 v_normal;
		
		void main() {
			vec3 normal = normalize(v_normal);
			float light = dot(normal, u_lightPosition);
			gl_FragColor = u_color;
			gl_FragColor.rgb = gl_FragColor.rgb + (vec3(1.0, 1.0, 1.0) - gl_FragColor.rgb) * light;
			gl_FragColor.a = u_color.a;
		}
	`;
	// Object vertex shader program without illumination
	const objectVS = `
		attribute vec4 a_position;
		attribute vec3 a_normal;
		
		uniform mat4 u_modelViewProjectionMatrix;
		
		varying highp vec3 v_normal;
		
		void main() {
			gl_Position = u_modelViewProjectionMatrix * a_position;
		}
	`;
	// Planefragment shader program without illumination
	const objectFS = `
		precision highp float;
		
		uniform vec4 u_color;
		
		void main() {
			gl_FragColor = u_color;
			gl_FragColor.a = u_color.a;
		}
	`;
	// Clipping vertex shader program
	const clippedObjectVS = `
		attribute vec4 a_position;
		
		uniform mat4 u_modelViewMatrix;
		uniform mat4 u_modelViewProjectionMatrix;
		
		varying vec3 v_modelViewPosition;
		
		void main() {
			v_modelViewPosition = (u_modelViewMatrix * a_position).xyz;
			gl_Position = u_modelViewProjectionMatrix * a_position;
		}
	`;
	// Clipping fragment shader program
	const clippedObjectFS = `
		precision highp float;
		
		uniform mat4 u_viewMatrix;
		uniform mat3 u_viewNormalMatrix;
		uniform vec4 u_clippingPlane;
		uniform vec4 u_color;

		varying vec3 v_modelViewPosition;

		vec4 planeToEC(vec4 plane, mat4 viewMatrix, mat3 viewNormalMatrix) {
			vec3 normal = vec3(plane.x, plane.y, plane.z);
			vec3 pointInWC = normal * -plane.w;
			vec3 pointInEC = (viewMatrix * vec4(pointInWC.xyz, 1.0)).xyz;
			vec3 normalInEC = normalize(viewNormalMatrix * normal);
			return vec4(normalInEC, -dot(normalInEC, pointInEC));
		}

		float calDistance(vec4 plane, vec3 position) {
			float distance = dot(vec3(plane.x, plane.y, plane.z), position) + plane.w;
			return distance;
		}
		
		void main() {
			vec4 planeInEC = planeToEC(u_clippingPlane, u_viewMatrix, u_viewNormalMatrix);
			float distance = calDistance(planeInEC, v_modelViewPosition);
			if (sign(planeInEC.z) * distance > 1e-4) {
				discard;
			}
			gl_FragColor = u_color;
		}
	`;

	// A gl program to draw object with illumination.
	const objectProgramWithLight	= webglUtils.createProgramInfo(gl, [objectLightVS,	objectLightFS]);
	// A gl program to draw object without illumination.
	const objectProgramWithoutLight	= webglUtils.createProgramInfo(gl, [objectVS,		objectFS]);
	// A gl program to draw the clipped object.
	const clippedObjectProgram		= webglUtils.createProgramInfo(gl, [clippedObjectVS,clippedObjectFS]);
	
	const cubeBuffer		= await glTF.loadGLTFBuffer(gl, './gltf/cube.gltf');
	const cuboidBuffer		= await glTF.loadGLTFBuffer(gl, './gltf/cuboid.gltf');
	const cylinderBuffer	= await glTF.loadGLTFBuffer(gl, './gltf/cylinder.gltf');
	const coneBuffer		= await glTF.loadGLTFBuffer(gl, './gltf/cone.gltf');
	const trunConeBuffer 	= await glTF.loadGLTFBuffer(gl, './gltf/truncatedCone.gltf');
	const prismBuffer		= await glTF.loadGLTFBuffer(gl, './gltf/prism.gltf');
	const complexBuffer		= await glTF.loadGLTFBuffer(gl, './gltf/yixing.gltf');
	const planeBuffer		= await glTF.loadGLTFBuffer(gl, './gltf/plane.gltf');
	const objectBufferInfo	= new Map ([
		['cube',			cubeBuffer[0]],
		['cube-edge',		cubeBuffer[1]],
		['cuboid',			cuboidBuffer[0]],
		['cuboid-edge',		cuboidBuffer[1]],
		['cylinder',		cylinderBuffer[0]],
		['cylinder-edge',	cylinderBuffer[1]],
		['cone', 			coneBuffer[0]],
		['cone-edge',		coneBuffer[1]],
		['trun-cone',		trunConeBuffer[0]],
		['trun-cone-edge',	trunConeBuffer[1]],
		['prism',			prismBuffer[0]],
		['prism-edge',		prismBuffer[1]],
		['complex',			complexBuffer[1]],
		['complex-edge',	complexBuffer[0]],
	]);
	const planeBufferInfo	= planeBuffer[0]

	// 与摄像机有关的常量
	const cameraDistance		= 50;
	const targetPosition		= [ 0, 0, 0];
	const defaultCameraNormal	= m4.normalize([20, 20, 50]);
	const upNormal				= [ 0, 1, 0];
	const horizontalOffset		= gl.canvas.clientWidth / 40;
	const verticalOffset		= gl.canvas.clientHeight / 40;
	const nearOffset			= 1;
	const farOffset				= 2000;
	// 与光源和物体有关的常量
	const lightPosition			= m4.normalize([-3, 1, 2]);
	const objectLength			= 10;
	const objectTranslation		= [ 0, 0, 0];
	const objectRotation		= [ Math.PI / 2, 0, 0];

	let currentObjectKey = 'cube'; 
	document.getElementById("objectList").addEventListener("change", () => {
		// 设置当前物体并更换缓冲
		document.getElementsByName("objectType").forEach((curr) => {
			if (curr.checked) {
				currentObjectKey = curr.id;
				changeObjectsMap(objectsMapToDraw, objectBufferInfo.get(currentObjectKey), objectBufferInfo.get(currentObjectKey + '-edge'));				
			}
		});
		// 重设平面
		animateTransform('plane', 500, preplanes[currentObjectKey]['default'](objectLength), interpolateSquare);
		// 更改预设平面选择器
		document.getElementsByName("planeSelector").forEach((curr) => {
			curr.firstElementChild.selected = 'true';
			curr.style.display = 'none';
		})
		document.getElementById(currentObjectKey + "-plane").style.display = '';
	});

	let animationQueue = [];
	let animationPlaying = false;
	let lastAnimation = {
		planeInfo: {
			xTranslation: 0,
			yTranslation: 0,
			zTranslation: 0,
			xRotation: 0,
			zRotation: 0,
		},
		cameraInfo: {
			rotateTheta: 0,
			rotatePhi: 0,
		}
	};
	let animationTime = 0;
	let animationLastTimestamp;

	function interpolateLinear(from, to, percent) {
		return from * (1 - percent) + to * percent;
	}

	function interpolateSquare(from, to, percent) {
		// Ease out square
		return from + (to - from) * (1 - Math.pow(percent - 1, 2));
	}

	function interpolateSine(from, to, percent) {
		// Ease out sine
		return from + (to - from) * Math.sin(percent * Math.PI / 2);
	}

	function interpolateCubic(from, to, percent) {
		// Ease out cubic
		return from + (to - from) * (1 + Math.pow(percent - 1, 3));
	}

	function computeNormalAnimation(vFrom, vTo) {
		const srcTheta = Math.acos(vFrom[1]);
		const dstTheta = Math.acos(vTo[1]);
		let phiFrom, phiTo;
		let thetaFromSin = Math.sin(srcTheta), thetaToSin = Math.sin(dstTheta);
		if (thetaFromSin === 0 && thetaToSin === 0) {
			// Any direction should work
			phiFrom = phiTo = 0;
		/*
		} else if (thetaFromSin === 0) {
			// Follow vTo
			phiFrom = phiTo = Math.atan2(vTo[0] / thetaToSin, vTo[2] / thetaToSin);
		} else if (thetaToSin === 0) {
			// Follow vFrom
			phiFrom = phiTo = Math.atan2(vFrom[0] / thetaFromSin, vFrom[2] / thetaFromSin);
		*/
		} else {
			phiFrom = Math.atan2(vFrom[0], vFrom[2]);
			phiTo = Math.atan2(vTo[0], vTo[2]);
		}
		if (phiTo - phiFrom > Math.PI) {
			phiFrom += Math.PI * 2;
		} else if (phiTo - phiFrom < -Math.PI) {
			phiFrom -= Math.PI * 2;
		}
		return {
			from: {
				rotateTheta: srcTheta,
				rotatePhi: phiFrom,
			},
			to: {
				rotateTheta: dstTheta,
				rotatePhi: phiTo,
			}
		};
	}

	function angleToVector(theta, phi) {
		return [
			Math.sin(theta) * Math.sin(phi),
			Math.cos(theta),
			Math.sin(theta) * Math.cos(phi),
		];
	}

	function animationInterpolate(from, to, timePercentage, interpolateFunc) {
		if (!interpolateFunc || !interpolateFunc.call) {
			// Fallback to linear interpolation
			if (interpolateFunc)
				console.warn("Animation: Fallback to linear interpolation")
			interpolateFunc = interpolateLinear;
		}
		let result = {};
		for (let prop in from) {
			const fromValue = from[prop];
			const toValue = to[prop];
			result[prop] = interpolateFunc(fromValue, toValue, timePercentage);
		}
		return result;
	}

	function animateTransform(type, duration, info, interpolateFunc) {
		if (type === 'plane') {
			animationQueue.push({
				duration: duration,
				planeInfo: info,
				interpolateFunc: interpolateFunc
			});
		} else if (type === 'camera') {
			animationQueue.push({
				duration: duration,
				cameraInfo: info,
				interpolateFunc: interpolateFunc
			});
		}
		animationPlaying = true;
	}

	let planeTransformMatrix = m4.identity();

	let planeInfo = {
		xTranslation:	0,
		yTranslation:	0,
		zTranslation:	0,
		xRotation: 		0,
		zRotation:		0,
	};
	function updatePlaneTransformMatrix(currPlaneInfo) {
		planeTransformMatrix = m4.translation(currPlaneInfo.xTranslation, currPlaneInfo.yTranslation, currPlaneInfo.zTranslation);
		planeTransformMatrix = m4.xRotate(planeTransformMatrix, degToRad(currPlaneInfo.xRotation));
		planeTransformMatrix = m4.zRotate(planeTransformMatrix, degToRad(currPlaneInfo.zRotation));
	}
	document.getElementById("presetPlane").addEventListener("change", (event) => {
		animateTransform('plane', 500, preplanes[currentObjectKey][event.target.value](objectLength), interpolateSquare);
	})
	document.getElementById("sliderList").addEventListener("input", (event) => {
		const editProp = event.target.id;
		const newValue = event.target.value;
		planeInfo[editProp] = Number(newValue);
		document.getElementById(editProp + "Value").textContent = newValue;
		updatePlaneTransformMatrix(planeInfo);
	});


	let cameraStatus = 0;
	/*  cameraStatus:
	 *		0: 从设置的摄像机视角观察物体
	 *		1: 从切割平面正上方观察截面
	 *		2: 从切割平面正下方观察截面
	 */
	let cameraNormal = defaultCameraNormal;
	document.getElementById("setCamera").addEventListener("click", () => {
		cameraStatus = ++cameraStatus % 3;
		if (cameraStatus !== 0) {
			// 观察平面
			document.getElementById("resetButton").style.display = 'none';
			const planeNormal = m4.transformVector(m4.inverse(m4.transpose(planeTransformMatrix)), m4.createVec4FromValues(0, 1, 0, 0));
			let cameraNormalDst = (cameraStatus === 1) ? m4.normalize(planeNormal.slice(0, 3)) : m4.normalize(m4.reverseVec3(planeNormal.slice(0, 3)))
			if (Math.abs(cameraNormalDst[1]) === 1) {
				// dirty trick
				// 当摄像机位置在y轴上时 则与upNormal重合 无法通过向量外积计算x轴
				// 因此将摄像机z轴位置微调一点点为0.0001 使得摄像机位置偏离y轴即可
				cameraNormalDst[2] = 1e-4;
				cameraNormalDst = m4.normalize(cameraNormalDst);
			}
			let normalAnimation = computeNormalAnimation(cameraNormal, cameraNormalDst);
			lastAnimation.cameraInfo = normalAnimation.from;
			animateTransform('camera', 500, normalAnimation.to, interpolateSquare);
		} else {
			// 复位摄像机
			document.getElementById("resetButton").style.display = '';
			let normalAnimation = computeNormalAnimation(cameraNormal, defaultCameraNormal);
			lastAnimation.cameraInfo = normalAnimation.from;
			animateTransform('camera', 500, normalAnimation.to, interpolateSquare);
		}
		
	});
	document.getElementById("resetButton").addEventListener("click", () => {
		animateTransform('plane', 500, preplanes[currentObjectKey]['default'](objectLength), interpolateSquare);
		document.getElementsByName("planeSelector").forEach((curr) => {
			if (curr.id === currentObjectKey + '-plane') {
				curr.firstElementChild.selected = 'true';
			}
		})
		document.getElementsByName("slider").forEach(function (currDiv) {currDiv.value = 0});
		document.getElementsByName("tag").forEach(function (currDiv) {currDiv.textContent = 0});
	});

	let mouseDragging = false;
	let lastCameraNormal = [0, 0, 0];
	let mouseDownPosition = [0, 0];
	const mouseFactor = 0.01;
	const thetaThreshold = 1e-4;
	canvas.addEventListener("mousedown", (event) => {
		mouseDragging = true;
		mouseDownPosition = [event.offsetX, event.offsetY];
		Object.assign(lastCameraNormal, cameraNormal);
	});

	canvas.addEventListener("mousemove", (event) => {
		if (mouseDragging) {
			let deltaX = event.offsetX - mouseDownPosition[0], deltaY = event.offsetY - mouseDownPosition[1];
			let theta = Math.acos(cameraNormal[1]);
			let phi = Math.atan2(cameraNormal[0], cameraNormal[2]);
			let newTheta = theta - deltaY * mouseFactor;
			if (newTheta > Math.PI - thetaThreshold)
				newTheta = Math.PI - thetaThreshold;
			else if (newTheta < thetaThreshold)
				newTheta = thetaThreshold;
			cameraNormal = angleToVector(newTheta, phi - deltaX * mouseFactor);
			mouseDownPosition = [event.offsetX, event.offsetY];
		}
	});
	// 可能在canvas外面松开鼠标，所以事件绑定到document上
	document.addEventListener("mouseup", () => {
		mouseDragging = false;
	})
	
	let objectUniforms = {
		u_modelViewProjectionMatrix: null,
		u_color: [0xD0/0xFF, 0xD8/0xFF, 0xEE/0xFF, 0.7],
		u_normalMatrix: null,
		u_lightPosition: null
	};
	let objectEdgeUniforms = {
		u_modelViewProjectionMatrix: null,
		u_color: [0.0, 0.0, 0.0, 1.0]
	}
	let objectClippedUniforms = {
		u_modelMatrix: null,
		u_viewMatrix: null,
		u_modelViewMatrix: null,
		u_modelViewProjectionMatrix: null,
		u_viewNormalMatrix: null,
		u_clippingPlane: null,
	};
	let planeUniforms = {
		u_modelViewProjectionMatrix: null,
		u_color: [1.0, 0x3C/0xFF, 0x3C/0xFF, 0.13]
	};
	let planeInnerUniforms = {
		u_modelViewProjectionMatrix: null,
		u_color: [1.0, 0x3C/0xFF, 0x3C/0xFF, 1]
	};

	let objectsMapToDraw = new Map ();
	initObjectsMap(objectsMapToDraw, currentObjectKey);

	function degToRad(d) {
		return d * Math.PI / 180;
	}

	function initObjectsMap(objectsMap, objectKey) {
		objectsMap.clear();
		objectsMap.set(
			'fillModelBuffer', {
				// 填充切面背后的几何体到模版缓冲
				programInfo: clippedObjectProgram,
				bufferInfo: objectBufferInfo.get(objectKey),
				uniforms: objectClippedUniforms,
				renderOption: {
					clearDepth: true,
					disableDepth: true,
					useStencil: true,
					stencilWrite: true,
					disableColor: true,
					stencilBackOp: [gl.KEEP, gl.KEEP, gl.DECR_WRAP],
					stencilFrontOp: [gl.KEEP, gl.KEEP, gl.INCR_WRAP],
					stencilFunc: [gl.ALWAYS, 1, 0xFF],
				}
			}
		).set(
			'fillDepthBuffer', {
				// 填充几何体背面到深度缓冲
				programInfo: objectProgramWithLight,
				bufferInfo: objectBufferInfo.get(objectKey),
				uniforms: objectUniforms,
				renderOption: {
					clearDepth: true,
					disableDepth: false,
					disableColor: true,
					cullFace: gl.FRONT,
				}
			}
		).set(
			'drawBackPlane', {
				// 画在几何体后的平面
				programInfo: objectProgramWithoutLight,
				bufferInfo: planeBufferInfo,
				uniforms: planeUniforms,
				renderOption: {
					disableColor: false,
					disableDepthWrite: true,
					depthFunc: gl.GREATER,
				}
			}
		).set(
			'drawBackObject', {
				// 画几何体背面
				programInfo: objectProgramWithLight,
				bufferInfo: objectBufferInfo.get(objectKey),
				uniforms: objectUniforms,
				renderOption: {
					disableDepth: true,
					cullFace: gl.FRONT,
				}
			}
		).set(
			'drawClippingPlane', {
				// 画切面
				programInfo: objectProgramWithoutLight,
				bufferInfo: planeBufferInfo,
				uniforms: planeInnerUniforms,
				renderOption: {
					disableDepth: true,
					useStencil: true,
					stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
					stencilFunc: [gl.EQUAL, 0x80, 0x80],
				}
			}
		).set(
			'drawObjectEdge', {
				// 画边框
				programInfo: objectProgramWithoutLight,
				bufferInfo: objectBufferInfo.get(objectKey + '-edge'),
				uniforms: objectEdgeUniforms,
				renderOption: {
					// clearDepth: true,
					depthFunc: gl.ALWAYS,
				}
			}
		).set(
			'drawFrontObject', {
				// 画几何体正面
				programInfo: objectProgramWithLight,
				bufferInfo: objectBufferInfo.get(objectKey),
				uniforms: objectUniforms,
				renderOption: {
					cullFace: gl.BACK,
				}
			}
		).set(
			'drawFrontPlane', {
				// 画在几何体前的平面
				programInfo: objectProgramWithoutLight,
				bufferInfo: planeBufferInfo,
				uniforms: planeUniforms,
				renderOption: {
					useStencil: true,
					stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
					stencilFunc: [gl.NOTEQUAL, 1, 0xFF],
				}
			}
		);
	}
	
	function changeObjectsMap(objectsMap, objectBuffer, objectEdgeBuffer) {
		const changeList = ['fillDepthBuffer', 'drawBackObject', 'fillModelBuffer', 'drawFrontObject'];
		for (let key of changeList) {
			const drawnObject = objectsMap.get(key);
			drawnObject.bufferInfo = objectBuffer;
		}
		objectsMapToDraw.get('drawObjectEdge').bufferInfo = objectEdgeBuffer;
	}

	function computeMatrix(viewProjectionMatrix, translation, rotation) {
		let matrix = m4.translate(viewProjectionMatrix,
			translation[0],
			translation[1],
			translation[2]);
		matrix = m4.xRotate(matrix, rotation[0]);
		matrix = m4.yRotate(matrix, rotation[1]);
		matrix = m4.zRotate(matrix, rotation[2]);
		return matrix
	}

	function computeModelMatrix(translation, rotation) {
		let modelMatrix = m4.translation(
			translation[0],
			translation[1],
			translation[2]);
		modelMatrix = m4.xRotate(modelMatrix, rotation[0]);
		modelMatrix = m4.yRotate(modelMatrix, rotation[1]);
		modelMatrix = m4.zRotate(modelMatrix, rotation[2]);
		return modelMatrix;
	}

	function computeClippingPlane(plane, translation, rotation) {
		let transformedPlane = m4.cloneVec4(plane);
		let transformMatrix = m4.translation(translation[0], translation[1], translation[2]);
		transformMatrix = m4.xRotate(transformMatrix, rotation[0]);
		transformMatrix = m4.yRotate(transformMatrix, rotation[1]);
		transformMatrix = m4.zRotate(transformMatrix, rotation[2]);
		transformMatrix = m4.transpose(transformMatrix);
		transformMatrix = m4.inverse(transformMatrix);
		transformedPlane = m4.transformVector(transformMatrix, transformedPlane);
		return transformedPlane;
	}

	requestAnimationFrame(drawScene);

	// Draw the scene.
	function drawScene(time) {
		if (!animationLastTimestamp)
			animationLastTimestamp = time;
		const deltaTime = time - animationLastTimestamp;
		animationLastTimestamp = time;
		
		if (animationPlaying) {
			if (animationQueue.length === 0) {
				animationPlaying = false;
				animationTime = 0;
			} else {
				const elapsedTime = deltaTime + animationTime;
				const nextAnimation = animationQueue[0];
				if (elapsedTime >= nextAnimation.duration) {
					// Finish one animation
					animationTime = 0;
					if (nextAnimation.planeInfo) {
						Object.assign(planeInfo, nextAnimation.planeInfo);
						Object.assign(lastAnimation.planeInfo, planeInfo);
					}
					if (nextAnimation.cameraInfo) {
						cameraNormal = m4.cloneVec3(angleToVector(nextAnimation.cameraInfo.rotateTheta, nextAnimation.cameraInfo.rotatePhi));
						
						if (Math.abs(cameraNormal[1]) === 1) {
							cameraNormal[2] = 1e-4;
							cameraNormal = m4.normalize(cameraNormal);
						}
						Object.assign(lastAnimation.cameraInfo, nextAnimation.cameraInfo);
					}
					animationQueue.shift();
					if (animationQueue.length === 0) {
						console.info("Animation: Animations end")
						animationPlaying = false;
					}
						
				} else {
					animationTime = elapsedTime;
					const timePercentage = elapsedTime / nextAnimation.duration;
					if (nextAnimation.planeInfo) {
						const middlePlaneInfo = animationInterpolate(lastAnimation.planeInfo, nextAnimation.planeInfo, timePercentage, nextAnimation.interpolateFunc);
						Object.assign(planeInfo, middlePlaneInfo);
					}
					if (nextAnimation.cameraInfo) {
						const middleCameraInfo = animationInterpolate(lastAnimation.cameraInfo, nextAnimation.cameraInfo, timePercentage, nextAnimation.interpolateFunc);
						// console.log(middleCameraInfo);
						cameraNormal = m4.cloneVec3(angleToVector(middleCameraInfo.rotateTheta, middleCameraInfo.rotatePhi));
						
						if (Math.abs(cameraNormal[1]) === 1) {
							cameraNormal[2] = 1e-4;
							cameraNormal = m4.normalize(cameraNormal);
						}
					}
				}
				// TODO: 同步数值变化到界面
				// console.log(JSON.stringify(planeInfo));
				updatePlaneTransformMatrix(planeInfo);
			}
			
		}

		time *= 0.0005;

		let lastUsedProgramInfo = null;
		let lastUsedBufferInfo = null;

		webglUtils.resizeCanvasToDisplaySize(gl.canvas);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		// TODO: 实现光照后再决定使用哪个
		gl.enable(gl.BLEND);
		// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		// gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		
		gl.enable(gl.DEPTH_TEST);
		gl.colorMask(true, true, true, true);
		gl.depthMask(true);
		gl.clearColor(1, 1, 1, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

		const cameraMatrix		= m4.lookAt(m4.multiplyVec3(cameraNormal, cameraDistance), targetPosition, upNormal);
		const viewMatrix		= m4.inverse(cameraMatrix);
		const projectionMatrix 	= m4.orthographic(-horizontalOffset, horizontalOffset, -verticalOffset, verticalOffset, nearOffset, farOffset);
		const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
		const viewNormalMatrix	= m4.normalFromMat4(viewMatrix);

		const clippingPlane		= m4.transformVector(m4.inverse(m4.transpose(planeTransformMatrix)), m4.createVec4FromValues(0, 1, 0, 0));

		// 对每个物体计算矩阵，并且传入uniform
		objectEdgeUniforms.u_modelViewProjectionMatrix = 
			computeMatrix(viewProjectionMatrix, objectTranslation, objectRotation);

		objectUniforms.u_modelViewProjectionMatrix = 
			computeMatrix(viewProjectionMatrix, objectTranslation, objectRotation);
		objectUniforms.u_normalMatrix	= m4.normalFromMat4(computeModelMatrix(objectTranslation, objectRotation));
		objectUniforms.u_lightPosition	= lightPosition;

		planeUniforms.u_modelViewProjectionMatrix = planeInnerUniforms.u_modelViewProjectionMatrix =
			m4.multiply(computeMatrix(viewProjectionMatrix, objectTranslation, [0,0,0]), planeTransformMatrix);

		objectClippedUniforms.u_modelMatrix					= computeModelMatrix(objectTranslation, objectRotation);
		objectClippedUniforms.u_viewMatrix					= viewMatrix;
		objectClippedUniforms.u_modelViewMatrix				= m4.multiply(viewMatrix, objectClippedUniforms.u_modelMatrix);
		objectClippedUniforms.u_modelViewProjectionMatrix	= m4.multiply(projectionMatrix, objectClippedUniforms.u_modelViewMatrix);
		objectClippedUniforms.u_viewNormalMatrix			= viewNormalMatrix;
		objectClippedUniforms.u_clippingPlane				= computeClippingPlane(clippingPlane, objectTranslation, [0, 0, 0]);
		
		// 在这里画物体
		objectsMapToDraw.forEach(function(object) {
			const programInfo	= object.programInfo;
			const bufferInfo	= object.bufferInfo;
			const renderOption	= object.renderOption || {};
			let bindBuffers = false;

			if (programInfo !== lastUsedProgramInfo) {
				lastUsedProgramInfo = programInfo;
				gl.useProgram(programInfo.program);
				// 更换程序后要重新绑定缓冲，因为只需要绑定程序要用的缓冲。
				// 如果两个程序使用相同的bufferInfo但是第一个只用位置数据，
				// 当我们从第一个程序切换到第二个时，有些属性就不存在。
				bindBuffers = true;
			}

			// 设置属性
			if (bindBuffers || bufferInfo !== lastUsedBufferInfo) {
				lastUsedBufferInfo = bufferInfo;
				webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
			}

			// 设置uniform变量
			webglUtils.setUniforms(programInfo, object.uniforms);
			
			{
				if (renderOption.disableDepth) {
					gl.disable(gl.DEPTH_TEST);
				} else {
					gl.enable(gl.DEPTH_TEST);
				}
				if (renderOption.clearDepth) {
					gl.depthMask(true);
					gl.clear(gl.DEPTH_BUFFER_BIT);
				}
				if (renderOption.disableDepthWrite) {
					gl.depthMask(false);
				} else {
					gl.depthMask(true);
				}
				if (renderOption.depthFunc) {
					gl.depthFunc(renderOption.depthFunc);
				} else {
					gl.depthFunc(gl.LESS);
				}
				if (renderOption.disableColor) {
					gl.colorMask(false, false, false, false);
				} else {
					gl.colorMask(true, true, true, true);
				}
				if (renderOption.cullFace) {
					gl.enable(gl.CULL_FACE);
					gl.cullFace(renderOption.cullFace);
				} else {
					gl.disable(gl.CULL_FACE);
				}
				// Stencil 相关
				if (renderOption.useStencil) {
					gl.enable(gl.STENCIL_TEST);
				} else {
					gl.disable(gl.STENCIL_TEST);
				}
				if (renderOption.stencilClear) {
					gl.stencilMask(0xFF);
					gl.clear(gl.STENCIL_BUFFER_BIT);
				}
				if (renderOption.stencilWrite) {
					gl.stencilMask(0xFF);
				} else {
					gl.stencilMask(0);
				}
				if (renderOption.stencilOp) {
					gl.stencilOp(renderOption.stencilOp[0], renderOption.stencilOp[1], renderOption.stencilOp[2]);
				}
				if (renderOption.stencilFrontOp) {
					gl.stencilOpSeparate(gl.FRONT, renderOption.stencilFrontOp[0], renderOption.stencilFrontOp[1], renderOption.stencilFrontOp[2]);
				}
				if (renderOption.stencilBackOp) {
					gl.stencilOpSeparate(gl.BACK, renderOption.stencilBackOp[0], renderOption.stencilBackOp[1], renderOption.stencilBackOp[2]);
				}
				if (renderOption.stencilFunc) {
					gl.stencilFunc(renderOption.stencilFunc[0], renderOption.stencilFunc[1], renderOption.stencilFunc[2])
				}
			}
			
			// 绘制3D图形
			if (bufferInfo.indices) {
				gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0)
			} else {
				gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
			}
			// webglUtils.drawBufferInfo(gl, bufferInfo)

		});

		requestAnimationFrame(drawScene);
	}
}

main();

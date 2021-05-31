"use strict";

function main() {
	const canvas = document.querySelector('#glcanvas');
	const gl = canvas.getContext('webgl', {stencil: true});
	if (!gl) {
		alert('浏览器不支持WebGL 请升级浏览器');
		return;
	}

	// Object vertex shader program
	const objectVS = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		attribute vec3 a_normal;
		
		uniform mat4 u_modelViewProjectionMatrix;
		uniform mat3 u_normalMatrix;
		
		varying highp vec3 v_normal;
		varying lowp vec4 v_color;
		
		void main() {
			gl_Position = u_modelViewProjectionMatrix * a_position;
			v_normal = u_normalMatrix * a_normal;
			v_color = a_color;
		}
	`;
	// Object fragment shader program
	const objectFS = `
		precision highp float;
		
		uniform vec4 u_colorMult;
		uniform vec3 u_lightPosition;

		varying highp vec3 v_normal;
		varying lowp vec4 v_color;
		
		void main() {
			vec3 normal = normalize(v_normal);
			float light = abs(dot(normal, u_lightPosition));
			gl_FragColor = v_color * u_colorMult;
			gl_FragColor.rgb = gl_FragColor.rgb * light * gl_FragColor.a;
			gl_FragColor.a = u_colorMult.a;
		}
	`;
	// Plane vertex shader program
	const planeVS = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		attribute vec3 a_normal;
		
		uniform mat4 u_modelViewProjectionMatrix;
		
		varying highp vec3 v_normal;
		varying lowp vec4 v_color;
		
		void main() {
			gl_Position = u_modelViewProjectionMatrix * a_position;
			v_color = a_color;
		}
	`;
	// Planefragment shader program
	const planeFS = `
		precision highp float;
		
		uniform vec4 u_colorMult;

		varying lowp vec4 v_color;
		
		void main() {
			gl_FragColor = v_color * u_colorMult;
			gl_FragColor.a = u_colorMult.a;
		}
	`;
	// Clipping vertex shader program
	const clippingVS = `
		attribute vec4 a_position;
		attribute vec4 a_color;
		
		uniform mat4 u_modelViewMatrix;
		uniform mat4 u_modelViewProjectionMatrix;
		
		varying lowp vec4 v_color;
		varying vec3 v_modelViewPosition;
		
		void main() {
			v_modelViewPosition = (u_modelViewMatrix * a_position).xyz;
			gl_Position = u_modelViewProjectionMatrix * a_position;
			v_color = a_color;
		}
	`;
	// Clipping fragment shader program
	const clippingFS = `
		precision highp float;
		
		uniform mat4 u_viewMatrix;
		uniform mat3 u_viewNormalMatrix;
		uniform vec4 u_clippingPlane;
		uniform vec4 u_colorMult;

		varying lowp vec4 v_color;
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
			float planeSide = dot(v_modelViewPosition, planeInEC.xyz);
			if (distance * planeSide < 1e-4) {
				discard;
			}
			gl_FragColor = v_color * u_colorMult;
		}
	`;

	const objectProgram		= webglUtils.createProgramInfo(gl, [objectVS,	objectFS]);
	const planeProgram		= webglUtils.createProgramInfo(gl, [planeVS,	planeFS]);
	const clippingProgram	= webglUtils.createProgramInfo(gl, [clippingVS,	clippingFS]);
	
	const objectBufferInfo	= new Map ([
		['cube',		primitives.createCubeWithVertexColorsBufferInfo(gl, 10)],
		['prism',		primitives.createTruncatedPyramidWithVertexColorsBufferInfo(gl, 15, 9, 15, 9, 10)],
		['slinder',		primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 5, 5, 10)],
		['cone',		primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 0, 5, 10)],
		['trun-cone',	primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 3, 7.5, 10)],
		['tri-prism',	primitives.createTruncatedRegularTriangularPyramidWithVertexColorsBufferInfo(gl, 10, 10, 10)],
	]);
	const planeBufferInfo	= primitives.createPlaneWithVertexColorsBufferInfo(gl, 30, 30, 1, 1, m4.identity());

	const cameraDistance		= 50;
	const targetPosition		= [0, 0, 0];
	const defaultCameraNormal	= m4.normalize([20, 20, 50]);
	const upNormal				= [0, 1, 0];

	const cameraAngleRadian	= degToRad(0);
	const fieldOfViewRadian	= degToRad(60);
	const cameraHeight		= 50;
	const aspect			= gl.canvas.clientWidth / gl.canvas.clientHeight;
	const horizontalOffset	= gl.canvas.clientWidth / 40;
	const verticalOffset	= gl.canvas.clientHeight / 40;
	const nearOffset		= 1;
	const farOffset			= 2000;

	const lightPosition		= m4.normalize([1, 2, 3]);
	const objectTranslation	= [  0,  0,  0];

	let currentObjectKey = 'cube'; 
	document.getElementById("objectList").addEventListener("change", () => {
		const objectTypeList = document.getElementsByName("objectType");
		objectTypeList.forEach((currObject) => {
			if (currObject.checked) {
				currentObjectKey = currObject.id;
				changeObjectsMap(objectsMapToDraw, objectBufferInfo.get(currentObjectKey));
			}
		});
	});

	let animationQueue = [
		{
			duration: 1000,
			planeInfo: {
				xTranslation: 0,
				yTranslation: 0,
				zTranslation: 0,
				xRotation: 30,
				zRotation: 45,
			}
		}
	];
	let animationPlaying = true;
	let lastPlaneInfo = {
		xTranslation: 0,
		yTranslation: 0,
		zTranslation: 0,
		xRotation: 0,
		zRotation: 0,
	};
	let animationTime = 0;
	let animationLastTimestamp;
	function animationInterpolate(from, to, timePercentage, interpolateFunc) {
		if (!interpolateFunc || !interpolateFunc.call) {
			// Fallback to linear interpolation
			if (interpolateFunc)
				console.warn("Animation: Fallback to linear interpolation")
			interpolateFunc = (fromValue, toValue, timePercentage) => fromValue * (1 - timePercentage) + toValue * timePercentage;
		}
		let result = {};
		for (let prop in from) {
			const fromValue = from[prop];
			const toValue = to[prop];
			result[prop] = interpolateFunc(fromValue, toValue, timePercentage);
		}
		return result;
	}
	document.getElementById("runAnimation").addEventListener("click", () => {
		animationQueue = animationQueue.concat([
			{
				duration: 1000,
				planeInfo: {
					xTranslation: 0,
					yTranslation: 4,
					zTranslation: 0,
					xRotation: 0,
					zRotation: 0,
				},
				interpolateFunc: function (from, to, percent) {
					// Ease out square
					return from + (to - from) * (1 - Math.pow(percent - 1, 2));
				}
			},
			{
				duration: 1000,
				planeInfo: {
					xTranslation: 2,
					yTranslation: 0,
					zTranslation: 0,
					xRotation: 90,
					zRotation: 90,
				},
				interpolateFunc: function (from, to, percent) {
					// Ease out sine
					return from + (to - from) * Math.sin(percent * Math.PI / 2);
				}
			},
			{
				duration: 1000,
				planeInfo: {
					xTranslation: 0,
					yTranslation: 0,
					zTranslation: 0,
					xRotation: 30,
					zRotation: 45,
				},
				interpolateFunc: function (from, to, percent) {
					// Ease out cubic
					return from + (to - from) * (1 + Math.pow(percent - 1, 3));
				}
			}
		]);
		Object.assign(lastPlaneInfo, planeInfo);
		animationLastTimestamp = performance.now();
		animationPlaying = true;
	});

	let planeTransformMatrix = m4.identity();
	let planeInfo = {
		xTranslation: 0,
		yTranslation: 0,
		zTranslation: 0,
		xRotation: 0,
		zRotation: 0,
	};
	function updatePlaneTransformMatrix(translateX, translateY, translateZ, rotateX, rotateZ) {
		planeTransformMatrix = m4.translation(translateX, translateY, translateZ);
		planeTransformMatrix = m4.xRotate(planeTransformMatrix, degToRad(rotateX));
		planeTransformMatrix = m4.zRotate(planeTransformMatrix, degToRad(rotateZ));
	}
	document.getElementById("sliderList").addEventListener("input", (event) => {
		const editProp = event.target.id;
		const newValue = event.target.value;
		planeInfo[editProp] = Number(newValue);
		document.getElementById(editProp + "Value").textContent = newValue;
		updatePlaneTransformMatrix(planeInfo.xTranslation, planeInfo.yTranslation, planeInfo.zTranslation, planeInfo.xRotation, planeInfo.zRotation);
	});


	let cameraStatus = 0;
	let cameraNormal = defaultCameraNormal;
	document.getElementById("setCamera").addEventListener("click", () => {
		cameraStatus = ++cameraStatus % 3;
		if (cameraStatus !== 0) {
			document.getElementById("resetButton").style.display = 'none';
			const planeNormal = m4.transformVector(m4.inverse(m4.transpose(planeTransformMatrix)), m4.createVec4FromValues(0, 1, 0, 0));
			cameraNormal = (cameraStatus === 1) ? m4.normalize(planeNormal.slice(0, 3)) : m4.normalize(m4.reverseVec3(planeNormal.slice(0, 3)))
			if (Math.abs(cameraNormal[1]) === 1) {
				cameraNormal[2] = 1e-4;
				cameraNormal = m4.normalize(cameraNormal);
			}
		} else {
			document.getElementById("resetButton").style.display = '';
			cameraNormal = defaultCameraNormal;
		}
		
	});
	document.getElementById("resetButton").addEventListener("click", () => {
		document.getElementsByName("slider").forEach(function (currDiv) {currDiv.value = 0});
		document.getElementsByName("tag").forEach(function (currDiv) {currDiv.textContent = 0});
		planeTransformMatrix = m4.identity();
		planeInfo = {
			xTranslation: 0,
			yTranslation: 0,
			zTranslation: 0,
			xRotation: 0,
			zRotation: 0,
		}
	});

	let objectUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [0.08, 0.8, 0.45, 0.8],
		u_normalMatrix: null,
		u_lightPosition: null
	};
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
		u_colorMult: [0.4, 0.88, 0.88, 0.6]
	};
	let planeInnerUniforms = {
		u_modelViewProjectionMatrix: null,
		u_colorMult: [0.84, 0.5, 0.12, 0.8]
	};

	let objectsMapToDraw = new Map ();
	initObjectsMap(objectsMapToDraw, currentObjectKey);

	function degToRad(d) {
		return d * Math.PI / 180;
	}

	function initObjectsMap(objectsMap, objectKey) {
		objectsMap.clear();
		objectsMap.set(
			'fillDepthBuffer', {
				// 填充几何体背面到深度缓冲
				programInfo: objectProgram,
				bufferInfo: objectBufferInfo.get(objectKey),
				uniforms: objectUniforms,
				renderOption: {
					disableColor: true,
					cullFace: gl.FRONT,
				}
			}
		).set(
			'drawBackPlane', {
				// 画在几何体后的平面
				programInfo: planeProgram,
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
				programInfo: objectProgram,
				bufferInfo: objectBufferInfo.get(objectKey),
				uniforms: objectUniforms,
				renderOption: {
					disableDepth: true,
					depthFunc: gl.LESS,
					cullFace: gl.FRONT,
				}
			}
		).set(
			'fillModelBuffer', {
				// 填充切面背后的几何体到模版缓冲
				programInfo: clippingProgram,
				bufferInfo: objectBufferInfo.get(objectKey),
				uniforms: objectClippedUniforms,
				renderOption: {
					clearDepth: true,
					useStencil: true,
					stencilWrite: true,
					disableColor: true,
					stencilBackOp: [gl.KEEP, gl.KEEP, gl.INCR],
					stencilFrontOp: [gl.KEEP, gl.KEEP, gl.DECR],
					stencilFunc: [gl.ALWAYS, 1, 0xFF],
				}
			}
		).set(
			'drawFrontObject', {
				// 画几何体正面
				programInfo: objectProgram,
				bufferInfo: objectBufferInfo.get(objectKey),
				uniforms: objectUniforms,
				renderOption: {
					clearDepth: true,
					cullFace: gl.BACK,
				}
			}
		).set(
			'drawFrontPlane', {
				// 画在几何体前的平面
				programInfo: planeProgram,
				bufferInfo: planeBufferInfo,
				uniforms: planeUniforms,
				renderOption: {
					useStencil: true,
					stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
					stencilFunc: [gl.NOTEQUAL, 1, 0xFF],
				}
			}
		).set(
			'drawClippingPlane', {
				// 画切面
				programInfo: planeProgram,
				bufferInfo: planeBufferInfo,
				uniforms: planeInnerUniforms,
				renderOption: {
					disableDepth: true,
					useStencil: true,
					stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
					stencilFunc: [gl.EQUAL, 1, 0xFF],
				}
			}
		);
	}
	
	function changeObjectsMap(objectsMap, objectBuffer) {
		objectsMap.set(
			'fillDepthBuffer', {
				// 填充几何体背面到深度缓冲
				programInfo: objectProgram,
				bufferInfo: objectBuffer,
				uniforms: objectUniforms,
				renderOption: {
					disableColor: true,
					cullFace: gl.FRONT,
				}
			}
		).set(
			'drawBackObject', {
				// 画几何体背面
				programInfo: objectProgram,
				bufferInfo: objectBuffer,
				uniforms: objectUniforms,
				renderOption: {
					disableDepth: true,
					depthFunc: gl.LESS,
					cullFace: gl.FRONT,
				}
			}
		).set(
			'fillModelBuffer', {
				// 填充切面背后的几何体到模版缓冲
				programInfo: clippingProgram,
				bufferInfo: objectBuffer,
				uniforms: objectClippedUniforms,
				renderOption: {
					clearDepth: true,
					useStencil: true,
					stencilWrite: true,
					disableColor: true,
					stencilBackOp: [gl.KEEP, gl.KEEP, gl.INCR],
					stencilFrontOp: [gl.KEEP, gl.KEEP, gl.DECR],
					stencilFunc: [gl.ALWAYS, 1, 0xFF],
				}
			}
		).set(
			'drawFrontObject', {
				// 画几何体正面
				programInfo: objectProgram,
				bufferInfo: objectBuffer,
				uniforms: objectUniforms,
				renderOption: {
					clearDepth: true,
					cullFace: gl.BACK,
				}
			}
		);
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
					Object.assign(planeInfo, nextAnimation.planeInfo);
					Object.assign(lastPlaneInfo, planeInfo);
					animationQueue.shift();
					if (animationQueue.length === 0) {
						console.info("Animation: Animations end")
						animationPlaying = false;
					}
						
				} else {
					animationTime = elapsedTime;
					const timePercentage = elapsedTime / nextAnimation.duration;
					const middlePlaneInfo = animationInterpolate(lastPlaneInfo, nextAnimation.planeInfo, timePercentage, nextAnimation.interpolateFunc);
					Object.assign(planeInfo, middlePlaneInfo);
				}
				// TODO: 同步数值变化到界面
				// console.log(JSON.stringify(planeInfo));
				updatePlaneTransformMatrix(planeInfo.xTranslation, planeInfo.yTranslation, planeInfo.zTranslation, planeInfo.xRotation, planeInfo.zRotation);
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

		const clippingPlane	= m4.transformVector(m4.inverse(m4.transpose(planeTransformMatrix)), m4.createVec4FromValues(0, 1, 0, 0));

		// 计算动画
		const objectRotation	=  [ 0,  0,  0];

		// 对每个物体计算矩阵，并且传入uniform
		objectUniforms.u_modelViewProjectionMatrix = 
			computeMatrix(viewProjectionMatrix, objectTranslation, objectRotation);
		objectUniforms.u_normalMatrix	= m4.normalFromMat4(computeModelMatrix(objectTranslation, objectRotation));
		objectUniforms.u_lightPosition	= lightPosition;

		planeUniforms.u_modelViewProjectionMatrix = planeInnerUniforms.u_modelViewProjectionMatrix =
			m4.multiply(computeMatrix(viewProjectionMatrix, objectTranslation, objectRotation), planeTransformMatrix);

		objectClippedUniforms.u_modelMatrix					= computeModelMatrix(objectTranslation, objectRotation);
		objectClippedUniforms.u_viewMatrix					= viewMatrix;
		objectClippedUniforms.u_modelViewMatrix				= m4.multiply(viewMatrix, objectClippedUniforms.u_modelMatrix);
		objectClippedUniforms.u_modelViewProjectionMatrix	= m4.multiply(projectionMatrix, objectClippedUniforms.u_modelViewMatrix);
		objectClippedUniforms.u_viewNormalMatrix			= viewNormalMatrix;
		objectClippedUniforms.u_clippingPlane				= computeClippingPlane(clippingPlane, objectTranslation, objectRotation);
		
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
				gl.depthMask(gl.LESS);
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
			
			
			// 绘制3D图形
			gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
		});

		requestAnimationFrame(drawScene);
	}
}

main();

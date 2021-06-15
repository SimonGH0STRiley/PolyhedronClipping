/**
 * A gltf format 3d moudule loader.
 *
 * @module gltf-loader
 */
 (function(root, factory) {	// eslint-disable-line
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['./webgl-utils', './3d-math'], factory);
	} else {
		// Browser globals
		root.glTF = factory(root);
	}
} (this, function() {
	class Node {
		constructor(source, name) {
			this.name		= name;
			this.parent		= null;
			this.children	= [];
			this.drawables	= [];
		}
		setParent(parent) {
			if (this.parent) {
				this.parent.__removeChild(this);
				this.parent = null;
			}
			if (parent) {
				parent.__addChild(this);
				this.parent = parent;
			}
		}
		traverse(fn) {
			fn(this);
			for (const child of this.children) {
				child.traverse(fn);
			}
		}
		__addChild(child) {
			this.children.push(child);
		}
		__removeChild(child) {
			this.children.splice(this.children.indexOf(child), 1);
		}
	}

	class MeshBuffer {
		constructor(mesh) {
			this.mesh = mesh;
		}
		getBuffer() {
			const mesh = this;
			for (const primitive of mesh.primitives) {
				return {
					bufferInfo: {
						attribs:		primitive.bufferInfo.attribs,
						numElements:	primitive.bufferInfo.numElements
					} 
				}
			}
		}
	}

	const accessorMap = new Map ([
		['SCALAR',	1],		
		['VEC2',	2],
		['VEC3',	3],
		['VEC4',	4],
		['MAT2',	4],
		['MAT3',	9],
		['MAT4',	16]
	]);;
	function accessorTypeToNumComponents (type) {
		if (accessorMap.has(type)) {
			return accessorMap.get(type);
		}
		throw new Error(`NOKEYERR: no numComponents for accessorType ${type}`);
	}

	const glMap = new Map ([
		[5120,	Int8Array	],	// gl.BYTE
		[5121,	Uint8Array	],	// gl.UNSIGNED_BYTE
		[5122,	Int16Array	],	// gl.SHORT
		[5123,	Uint16Array	],	// gl.UNSIGNED_SHORT
		[5124,	Int32Array	],	// gl.INT
		[5125,	Uint32Array	],	// gl.UNSIGNED_INT
		[5126,	Float32Array]	// gl.FLOAT
	]);
	function glTypeToTypedArray (type) {
		if (glMap.has(type)) {
			return glMap.get(type);
		}
		throw new Error(`NOKEYERR: no typedArray for glType ${type}`);
	}

	function getAccessorAndWebGLBuffer (gl, gltf, accessorIndex) {
		const accessor		= gltf.accessors[accessorIndex];
		const bufferView	= gltf.bufferViews[accessor.bufferView];
		if (!bufferView.webglBuffer) {
			const buffer = gl.createBuffer();
			const target = bufferView.target || gl.ARRAY_BUFFER;
			const arrayBuffer = gltf.buffers[bufferView.buffer];
			const arrayType = glTypeToTypedArray(accessor.componentType);
			const bufferLength = bufferView.byteLength / arrayType.BYTES_PER_ELEMENT;
			const data = new arrayType (arrayBuffer, bufferView.byteOffset, bufferLength);
			gl.bindBuffer(target, buffer);
			gl.bufferData(target, data, gl.STATIC_DRAW);
			bufferView.webglBuffer = buffer;
		}
		return {
			accessor,
			buffer: bufferView.webglBuffer,
			stride: bufferView.stride || 0,
		};
	}

	async function loadGLTFBuffer(gl, url) {
		const gltf = await loadJSON(url);
		const baseURL = new URL(url, location.href);
		gltf.buffers = await Promise.all(gltf.buffers.map((buffer) => {
			const url = new URL(buffer.uri, baseURL.href);
			return loadBinary(url.href);
		}));

		const gltfBufferArray = [];
		
		gltf.meshes.forEach((mesh) => {
			mesh.primitives.forEach((primitive) => {
				const attribs = {};
				let numElements;
				for (const [attribName, index] of Object.entries(primitive.attributes)) {
					if (attribName === 'POSITION' || attribName === 'NORMAL' || attribName === 'TEXCOORD_0') {
						const {accessor, buffer} = getAccessorAndWebGLBuffer(gl, gltf, index);
						numElements = accessor.count;
						attribs[`a_${attribName.toLowerCase()}`] = {
						// attribs[`a_${attribName}`] = {
							buffer:			buffer,
							numComponents:	accessorTypeToNumComponents(accessor.type),
							type:			accessor.componentType,
							offset:			accessor.byteOffset | 0
						};
					}
				}
				const bufferInfo = {
					attribs, numElements
				}
				if (primitive.indices !== undefined) {
					const bufferView = gltf.bufferViews[primitive.indices];
					if (bufferView.target !== undefined) {
						if (bufferView.target !== 34963)
							console.warn("BufferView " + primitive.indices + " should have a target equal to ELEMENT_ARRAY_BUFFER");
					} else {
						bufferView.target = 34963; // ELEMENT_ARRAY_BUFFER
					}
					const {accessor, buffer} = getAccessorAndWebGLBuffer(gl, gltf, primitive.indices);
					bufferInfo.numElements = accessor.count;
					bufferInfo.indices = buffer;
					bufferInfo.elementType = accessor.componentType;
				}
				primitive.bufferInfo = bufferInfo;
				gltfBufferArray.push(bufferInfo);
			})
		});
		console.log(gltfBufferArray)
		return gltfBufferArray
	}

	async function loadFile(url, typeFunc) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`LOADERR: Could not load gltf file from ${url}`);
	}
		return await response[typeFunc]();
	}

	async function loadBinary(url) {
		return loadFile(url, 'arrayBuffer');
	}

	async function loadJSON(url) {
		return loadFile(url, 'json');
	}

	return {
		loadGLTFBuffer
	}
}));
/*
 * Copyright 2021 GFXFundamentals.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of GFXFundamentals. nor the names of his
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Various functions to make simple primitives
 *
 * @module primitives
 */
 (function(root, factory) {  // eslint-disable-line
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['./webgl-utils', './3d-math'], factory);
	} else {
		// Browser globals
		root.primitives = factory.call(root);
	}
}(this, function(webglUtils, m4) {
	'use strict';

	webglUtils = webglUtils || this.webglUtils;
	m4 = m4 || this.m4 || math3d;

	function allButIndices(name) {
		return name !== 'indices';
	}

	/**
	 * Given indexed vertices creates a new set of vertices unindexed by expanding the indexed vertices.
	 * @param {Object.<string, TypedArray>} vertices The indexed vertices to deindex
	 * @return {Object.<string, TypedArray>} The deindexed vertices
	 * @memberOf module:primitives
	 */
	function deindexVertices(vertices) {
		const indices = vertices.indices;
		const newVertices = {};
		const numElements = indices.length;

		function expandToUnindexed(channel) {
			const srcBuffer = vertices[channel];
			const numComponents = srcBuffer.numComponents;
			const dstBuffer = webglUtils.createAugmentedTypedArray(numComponents, numElements, srcBuffer.constructor);
			for (let ii = 0; ii < numElements; ++ii) {
				const ndx = indices[ii];
				const offset = ndx * numComponents;
				for (let jj = 0; jj < numComponents; ++jj) {
					dstBuffer.push(srcBuffer[offset + jj]);
				}
			}
			newVertices[channel] = dstBuffer;
		}

		Object.keys(vertices).filter(allButIndices).forEach(expandToUnindexed);

		return newVertices;
	}

	/**
	 * flattens the normals of deindexed vertices in place.
	 * @param {Object.<string, TypedArray>} vertices The deindexed vertices who's normals to flatten
	 * @return {Object.<string, TypedArray>} The flattened vertices (same as was passed in)
	 * @memberOf module:primitives
	 */
	function flattenNormals(vertices) {
		if (vertices.indices) {
			throw 'can\'t flatten normals of indexed vertices. deindex them first';
		}

		const normals = vertices.normal;
		const numNormals = normals.length;
		for (let ii = 0; ii < numNormals; ii += 9) {
			// pull out the 3 normals for this triangle
			const nax = normals[ii + 0];
			const nay = normals[ii + 1];
			const naz = normals[ii + 2];

			const nbx = normals[ii + 3];
			const nby = normals[ii + 4];
			const nbz = normals[ii + 5];

			const ncx = normals[ii + 6];
			const ncy = normals[ii + 7];
			const ncz = normals[ii + 8];

			// add them
			let nx = nax + nbx + ncx;
			let ny = nay + nby + ncy;
			let nz = naz + nbz + ncz;

			// normalize them
			const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

			nx /= length;
			ny /= length;
			nz /= length;

			// copy them back in
			normals[ii + 0] = nx;
			normals[ii + 1] = ny;
			normals[ii + 2] = nz;

			normals[ii + 3] = nx;
			normals[ii + 4] = ny;
			normals[ii + 5] = nz;

			normals[ii + 6] = nx;
			normals[ii + 7] = ny;
			normals[ii + 8] = nz;
		}

		return vertices;
	}

	function applyFuncToV3Array(array, matrix, fn) {
		const len = array.length;
		const tmp = new Float32Array(3);
		for (let ii = 0; ii < len; ii += 3) {
			fn(matrix, [array[ii], array[ii + 1], array[ii + 2]], tmp);
			array[ii    ] = tmp[0];
			array[ii + 1] = tmp[1];
			array[ii + 2] = tmp[2];
		}
	}

	function transformNormal(mi, v, dst) {
		dst = dst || new Float32Array(3);
		const v0 = v[0];
		const v1 = v[1];
		const v2 = v[2];

		dst[0] = v0 * mi[0 * 4 + 0] + v1 * mi[0 * 4 + 1] + v2 * mi[0 * 4 + 2];
		dst[1] = v0 * mi[1 * 4 + 0] + v1 * mi[1 * 4 + 1] + v2 * mi[1 * 4 + 2];
		dst[2] = v0 * mi[2 * 4 + 0] + v1 * mi[2 * 4 + 1] + v2 * mi[2 * 4 + 2];

		return dst;
	}

	/**
	 * Reorients directions by the given matrix..
	 * @param {number[]|TypedArray} array The array. Assumes value floats per element.
	 * @param {Matrix} matrix A matrix to multiply by.
	 * @return {number[]|TypedArray} the same array that was passed in
	 * @memberOf module:primitives
	 */
	function reorientDirections(array, matrix) {
		applyFuncToV3Array(array, matrix, m4.transformDirection);
		return array;
	}

	/**
	 * Reorients normals by the inverse-transpose of the given
	 * matrix..
	 * @param {number[]|TypedArray} array The array. Assumes value floats per element.
	 * @param {Matrix} matrix A matrix to multiply by.
	 * @return {number[]|TypedArray} the same array that was passed in
	 * @memberOf module:primitives
	 */
	function reorientNormals(array, matrix) {
		applyFuncToV3Array(array, m4.inverse(matrix), transformNormal);
		return array;
	}

	/**
	 * Reorients positions by the given matrix. In other words, it
	 * multiplies each vertex by the given matrix.
	 * @param {number[]|TypedArray} array The array. Assumes value floats per element.
	 * @param {Matrix} matrix A matrix to multiply by.
	 * @return {number[]|TypedArray} the same array that was passed in
	 * @memberOf module:primitives
	 */
	function reorientPositions(array, matrix) {
		applyFuncToV3Array(array, matrix, m4.transformPoint);
		return array;
	}

	/**
	 * Reorients arrays by the given matrix. Assumes arrays have
	 * names that contains 'pos' could be reoriented as positions,
	 * 'binorm' or 'tan' as directions, and 'norm' as normals.
	 *
	 * @param {Object.<string, (number[]|TypedArray)>} arrays The vertices to reorient
	 * @param {Matrix} matrix matrix to reorient by.
	 * @return {Object.<string, (number[]|TypedArray)>} same arrays that were passed in.
	 * @memberOf module:primitives
	 */
	function reorientVertices(arrays, matrix) {
		Object.keys(arrays).forEach(function(name) {
			const array = arrays[name];
			if (name.indexOf('pos') >= 0) {
				reorientPositions(array, matrix);
			} else if (name.indexOf('tan') >= 0 || name.indexOf('binorm') >= 0) {
				reorientDirections(array, matrix);
			} else if (name.indexOf('norm') >= 0) {
				reorientNormals(array, matrix);
			}
		});
		return arrays;
	}

	/**
	 * creates a random integer between 0 and range - 1 inclusive.
	 * @param {number} range
	 * @return {number} random value between 0 and range - 1 inclusive.
	 */
	function randInt(range) {
		return Math.random() * range | 0;
	}

	/**
	 * Used to supply random colors
	 * @callback RandomColorFunc
	 * @param {number} ndx index of triangle/quad if unindexed or index of vertex if indexed
	 * @param {number} channel 0 = red, 1 = green, 2 = blue, 3 = alpha
	 * @return {number} a number from 0 to 255
	 * @memberOf module:primitives
	 */

	/**
	 * @typedef {Object} RandomVerticesOptions
	 * @property {number} [vertsPerColor] Defaults to 3 for non-indexed vertices
	 * @property {module:primitives.RandomColorFunc} [rand] A function to generate random numbers
	 * @memberOf module:primitives
	 */

	/**
	 * Creates an augmentedTypedArray of random vertex colors.
	 * If the vertices are indexed (have an indices array) then will
	 * just make random colors. Otherwise assumes they are triangless
	 * and makes one random color for every 3 vertices.
	 * @param {Object.<string, augmentedTypedArray>} vertices Vertices as returned from one of the createXXXVertices functions.
	 * @param {module:primitives.RandomVerticesOptions} [options] options.
	 * @return {Object.<string, augmentedTypedArray>} same vertices as passed in with `color` added.
	 * @memberOf module:primitives
	 */
	function makeRandomVertexColors(vertices, options) {
		options = options || {};
		const numElements = vertices.position.numElements;
		const vcolors = webglUtils.createAugmentedTypedArray(4, numElements, Uint8Array);
		const rand = options.rand || function(ndx, channel) {
			return channel < 3 ? randInt(256) : 255;
		};
		vertices.color = vcolors;
		if (vertices.indices) {
			// just make random colors if index
			for (let ii = 0; ii < numElements; ++ii) {
				vcolors.push(rand(ii, 0), rand(ii, 1), rand(ii, 2), rand(ii, 3));
			}
		} else {
			// make random colors per triangle
			const numVertsPerColor = options.vertsPerColor || 3;
			const numSets = numElements / numVertsPerColor;
			for (let ii = 0; ii < numSets; ++ii) {
				const color = [rand(ii, 0), rand(ii, 1), rand(ii, 2), rand(ii, 3)];
				for (let jj = 0; jj < numVertsPerColor; ++jj) {
					vcolors.push(color);
				}
			}
		}
		return vertices;
	}

	/**
	 * creates a function that calls fn to create vertices and then
	 * creates a buffers for them
	 */
	function createBufferFunc(fn) {
		return function(gl) {
			const arrays = fn.apply(this, Array.prototype.slice.call(arguments, 1));
			return webglUtils.createBuffersFromArrays(gl, arrays);
		};
	}

	/**
	 * creates a function that calls fn to create vertices and then
	 * creates a bufferInfo object for them
	 */
	function createBufferInfoFunc(fn) {
		return function(gl) {
			const arrays = fn.apply(null,  Array.prototype.slice.call(arguments, 1));
			return webglUtils.createBufferInfoFromArrays(gl, arrays);
		};
	}

	/**
	 * Creates XZ plane vertices.
	 * The created plane has position, normal and uv streams.
	 *
	 * @param {number} [opt_width]			Width of the plane. Default = 2
	 * @param {number} [opt_depth]			Depth of the plane. Default = 2
	 * @param {number} [opt_widthDivides]	Number of steps across the plane. Default = 1
	 * @param {number} [opt_depthDivides]	Number of steps down the plane. Default = 1
	 * @param {Matrix4} [opt_matrix]		A matrix by which to multiply all the vertices.
	 * @return {Object.<string, TypedArray>} The created plane vertices.
	 * @memberOf module:primitives
	 */
	function createPlaneVertices(
			opt_width,
			opt_depth,
			opt_widthDivides,
			opt_depthDivides,
			opt_matrix) {
		//参数定义
		const width = opt_width || 2;
		const depth = opt_depth || 2;
		const widthDivides = opt_widthDivides || 1;
		const depthDivides = opt_depthDivides || 1;
		const matrix = opt_matrix || m4.identity();
		const numVertices = (widthDivides + 1) * (depthDivides + 1);
		
		const positions = webglUtils.createAugmentedTypedArray(3, numVertices);
		const normals 	= webglUtils.createAugmentedTypedArray(3, numVertices);
		const texCoords = webglUtils.createAugmentedTypedArray(2, numVertices);
		const indices	= webglUtils.createAugmentedTypedArray(3, widthDivides * depthDivides * 2, Uint16Array);
	
		for (let z = 0; z <= depthDivides; z++) {
			for (let x = 0; x <= widthDivides; x++) {
				const u = x / widthDivides;
				const v = z / depthDivides;
				positions.push(
					width * u - width * 0.5,
					0,
					depth * v - depth * 0.5
				);
				normals.push(0, 1, 0);
				texCoords.push(u, v);
			}
		}

		for (let z = 0; z < depthDivides; z++) {
			for (let x = 0; x < widthDivides; x++) {
				indices.push(
					(z + 0) * (widthDivides + 1) + x,
					(z + 1) * (widthDivides + 1) + x,
					(z + 0) * (widthDivides + 1) + x + 1
				);
				indices.push(
					(z + 1) * (widthDivides + 1) + x,
					(z + 1) * (widthDivides + 1) + x + 1,
					(z + 0) * (widthDivides + 1) + x + 1
				);
			}
		}

		const arrays = reorientVertices({
			position: positions,
			normal: normals,
			texcoord: texCoords,
			indices: indices,
		}, matrix);
		return arrays;
	}

	/**
	 * Array of the indices of corners of each face of a cube. The
	 * order of indices are in counter clockwise, such that the 
	 * directions of faces are all towards outside.
	 * @type {Array.<number[]>}
	 */
	const CUBE_FACE_INDICES = [
		[3, 7, 5, 1], // right
		[6, 2, 0, 4], // left
		[6, 7, 3, 2], // top
		[0, 1, 5, 4], // bottom
		[7, 6, 4, 5], // front
		[2, 3, 1, 0], // back
	];

	/**
	 * Creates the vertices and indices for a cube. The
	 * cube will be created around the origin. (-size / 2, size / 2)
	 *
	 * @param {number} size Width, height and depth of the cube.
	 * @return {Object.<string, TypedArray>} The
	 *         created plane vertices.
	 * @memberOf module:primitives
	 */
	function createCubeVertices(size) {
		const k = size / 2;

		const cornerVertices = [
			[-k, -k, -k],
			[+k, -k, -k],
			[-k, +k, -k],
			[+k, +k, -k],
			[-k, -k, +k],
			[+k, -k, +k],
			[-k, +k, +k],
			[+k, +k, +k],
		];

		const faceNormals = [
			[+1, +0, +0],
			[-1, +0, +0],
			[+0, +1, +0],
			[+0, -1, +0],
			[+0, +0, +1],
			[+0, +0, -1],
		];

		const uvCoords = [
			[1, 0],
			[0, 0],
			[0, 1],
			[1, 1],
		];

		const numVertices = 8 * 3;
		const positions = webglUtils.createAugmentedTypedArray(3, numVertices);
		const normals   = webglUtils.createAugmentedTypedArray(3, numVertices);
		const texCoords = webglUtils.createAugmentedTypedArray(2 , numVertices);
		const indices   = webglUtils.createAugmentedTypedArray(3, 6 * 2, Uint16Array);

		for (let f = 0; f < 6; ++f) {
			const faceIndices = CUBE_FACE_INDICES[f];
			for (let v = 0; v < 4; ++v) {
				const position = cornerVertices[faceIndices[v]];
				const normal = faceNormals[f];
				const uv = uvCoords[v];

				// Each face needs all four vertices because the normals and texture
				// coordinates are not all the same.
				positions.push(position);
				normals.push(normal);
				texCoords.push(uv);

			}
			// Two triangles make a square face.
			const offset = 4 * f;
			indices.push(offset + 0, offset + 1, offset + 2);
			indices.push(offset + 0, offset + 2, offset + 3);
		}
		
		return {
			position: positions,
			normal: normals,
			texcoord: texCoords,
			indices: indices,
		};
	}

	/**
	 * Array of the indices of corners of each face of a truncated
	 * pyramid. The order of indices are in counter clockwise, such
	 * that the directions of faces are all towards outside.
	 * @type {Array.<number[]>}
	 */
	const PYRAMID_FACE_INDICES = [
		[3, 7, 5, 1], // right
		[6, 2, 0, 4], // left
		[6, 7, 3, 2], // top
		[0, 1, 5, 4], // bottom
		[7, 6, 4, 5], // front
		[2, 3, 1, 0], // back
	];

	/**
	 * Creates vertices for a truncated pyramid. A truncated pyramid
	 * can also be used to create cubes and regular pyramids. The
	 * truncated pyramid will be created centered about the origin, with the
	 * y axis as its vertical axis. The created pyramid has position, normal
	 * and uv streams.
	 *
	 * @param {number} topLength	Top length of truncated pyramid.
	 * @param {number} topWidth		Top width of truncated pyramid.
	 * @param {number} bottomLength	Bottom length of truncated pyramid.
	 * @param {number} bottomWidth	Bottom width of truncated pyramid.
	 * @param {number} height		Height of truncated pyramid.
	 * @return {Object.<string, TypedArray>} The created plane vertices.
	 * @memberOf module:primitives
	 */
	function createTruncatedPyramidVertices(
		topLength,
		topWidth,
		bottomLength,
		bottomWidth,
		height) {
		const topX = topLength / 2;
		const topZ = topWidth / 2;
		const bottomX = bottomLength / 2;
		const bottomZ = bottomWidth / 2;
		const heightY = height / 2;
		const slantXY = Math.atan2(bottomX - topX, height);
		const sinSlantXY = Math.sin(slantXY);
		const cosSlantXY = Math.cos(slantXY);
		const slantYZ = Math.atan2(bottomZ - topZ, height);
		const sinSlantYZ = Math.sin(slantYZ);
		const cosSlantYZ = Math.cos(slantYZ);
	
		const cornerVertices = [
			[-bottomX,	-heightY,	-bottomZ],
			[+bottomX,	-heightY,	-bottomZ],
			[-topX,		+heightY,	-topZ],
			[+topX,		+heightY,	-topZ],
			[-bottomX,	-heightY,	+bottomZ],
			[+bottomX,	-heightY,	+bottomZ],
			[-topX,		+heightY,	+topZ],
			[+topX,		+heightY,	+topZ],
		];
	
		const faceNormals = [
			[+cosSlantXY, +sinSlantXY, +0],	// right
			[-cosSlantXY, +sinSlantXY, +0],	// left
			[+0, +1, +0],					// top
			[+0, -1, +0],					// bottom
			[+0, +sinSlantYZ, +cosSlantYZ],	// front
			[+0, +sinSlantYZ, -cosSlantYZ],	// back
		];
	
		const uvCoords = [
			[1, 0],
			[0, 0],
			[0, 1],
			[1, 1]
		];
	
		const numVertices = 8 * 3;
		const positions = webglUtils.createAugmentedTypedArray(3, numVertices);
		const normals   = webglUtils.createAugmentedTypedArray(3, numVertices);
		const texCoords = webglUtils.createAugmentedTypedArray(2 , numVertices);
		const indices   = webglUtils.createAugmentedTypedArray(3, 6 * 2, Uint16Array);
	
		for (let i = 0; i < 6; i++) {
			const faceIndices = PYRAMID_FACE_INDICES[i];
			for (let j = 0; j < 4; j++) {
				const position = cornerVertices[faceIndices[j]];
				const normal = faceNormals[i];
				const uv = uvCoords[j];
				positions.push(position);
				normals.push(normal);
				texCoords.push(uv)
			}
			const offset = 4 * i;
			indices.push(offset + 0, offset + 1, offset + 2);
			indices.push(offset + 0, offset + 2, offset + 3);
		}
	
		return{
			position: positions,
			normal: normals,
			texcoord: texCoords,
			indices: indices
		}
	}

	/**
	 * Array of the indices of corners of each face of a truncated
	 * regular triangular pyramid.
	 * @type {Array.<number[]>}
	 */
	const TRIANGULAR_PYRAMID_FACE_INDICES = [
		// The order of indices are in counter clockwise, such that
		// the directions of faces are all towards outside.
		[3, 4, 5],		// top
		[0, 2, 1],		// bottom
		[0, 1, 4, 3],	// front
		[1, 2, 5, 4],	// right
		[2, 0, 3, 5],	// left
	];

	/**
	 * Creates vertices for a truncated regular triangular pyramid. A truncated
	 * regular triangular pyramid can also be used to create regular triangular 
	 * prisms and regular triangular pyramids. The truncated regular triangular 
	 * pyramid will be created centered about the origin, with the y axis as 
	 * its vertical axis. The created pyramid has position, normal and uv
	 * streams.
	 *
	 * @param {number} topLength	Width of top trangle.
	 * @param {number} bottomLength	Width of bottom pyramid.
	 * @param {number} height		Height of truncated pyramid.
	 * @return {Object.<string, TypedArray>} The created plane vertices.
	 * @memberOf module:primitives
	 */
	 function createTruncatedRegularTriangularPyramidVertices(
		topLength,
		bottomLength,
		height) {
		const theta = Math.PI / 6;
		const topX = topLength / 2;
		const topZ = topX * Math.tan(theta);
		const bottomX = bottomLength / 2;
		const bottomZ = bottomX * Math.tan(theta);
		const heightY = height / 2;
		const slant = Math.atan2((bottomX - topX) * Math.tan(theta), height);
		const sinSlant = Math.sin(slant);
		const cosSlant = Math.cos(slant);
	
		const cornerVertices = [
			[-bottomX,	-heightY,	+bottomZ],
			[+bottomX,	-heightY,	+bottomZ],
			[0,			-heightY,	-bottomZ * 2],
			[-topX,		+heightY,	+topZ],
			[+topX,		+heightY,	+topZ],
			[0,			+heightY,	-topZ * 2],
		];
	
		const faceNormals = [
			[+0, +1, +0],					// top
			[+0, -1, +0],					// bottom
			[+0, +sinSlant, +cosSlant],		// front
			[+cosSlant * Math.cos(theta), +sinSlant, -cosSlant * Math.sin(theta)],	// right
			[-cosSlant * Math.cos(theta), +sinSlant, -cosSlant * Math.sin(theta)],	// left
		];
	
		const uvCoords = [
			[1, 0],
			[0, 0],
			[0, 1],
			[1, 1]
		];
	
		const numVertices = 6 * 3;
		const positions = webglUtils.createAugmentedTypedArray(3, numVertices);
		const normals   = webglUtils.createAugmentedTypedArray(3, numVertices);
		const texCoords = webglUtils.createAugmentedTypedArray(2 , numVertices);
		const indices   = webglUtils.createAugmentedTypedArray(3, 2 + 3 * 2, Uint16Array);
	
		for (let i = 0; i < 5; i++) {
			const faceIndices = TRIANGULAR_PYRAMID_FACE_INDICES[i];
			for (let j = 0; j < faceIndices.length; j++) {
				const position = cornerVertices[faceIndices[j]];
				const normal = faceNormals[i];
				const uv = uvCoords[j];
				positions.push(position);
				normals.push(normal);
				texCoords.push(uv)
			}
			if (i < 2) {
				const offset = 3 * i;
				indices.push(offset + 0, offset + 1, offset + 2)
			} else {
				const offset = 6 + 4 * (i - 2);
				indices.push(offset + 0, offset + 1, offset + 2);
				indices.push(offset + 0, offset + 2, offset + 3);
			}
		}
	
		return{
			position: positions,
			normal: normals,
			texcoord: texCoords,
			indices: indices
		}
	}

	/**
	 * Creates sphere vertices.
	 * The created sphere has position, normal and uv streams.
	 *
	 * @param {number} radius				radius of the sphere.
	 * @param {number} [opt_warpDivides]	number of warps on the sphere. Default = 60.
	 * @param {number} [opt_weftDivides]	number of wefts on the sphere. Default = 30.
	 * @param {number} [opt_startLatitude]	where to start the top of the sphere. Default = 0.
	 * @param {number} [opt_endLatitude]	where to end the bottom of the sphere. Default = Math.PI.
	 * @param {number} [opt_startLongitude] where to start wrapping the sphere. Default = 0.
	 * @param {number} [opt_endLongitude] where to end wrapping the sphere. Default = 2 * Math.PI.
	 * @return {Object.<string, TypedArray>} The
	 *         created plane vertices.
	 * @memberOf module:primitives
	 */
	function createSphereVertices(
		radius,
		opt_warpDivides,
		opt_weftDivides,
		opt_startLatitude,
		opt_endLatitude,
		opt_startLongitude,
		opt_endLongitude){
		// 参数定义
		const warpDivides = (!opt_warpDivides || opt_warpDivides <= 0) ? 60 : opt_warpDivides;	// 经线分割数
		const weftDivides = (!opt_weftDivides || opt_weftDivides <= 0) ? 30 : opt_weftDivides;	// 纬线分割数
		const startLatitude = opt_startLatitude || 0;
		const endLatitude = opt_endLatitude || Math.PI;
		const startLongitude = opt_startLongitude || 0;
		const endLongitude = opt_endLongitude || (Math.PI * 2);
		const latitudeRange = endLatitude - startLatitude;
		const longitutdeRange = endLongitude - startLongitude;
		const numVertices = (warpDivides + 1) * (weftDivides + 1);

		const positions = webglUtils.createAugmentedTypedArray(3, numVertices);
		const normals   = webglUtils.createAugmentedTypedArray(3, numVertices);
		const texCoords = webglUtils.createAugmentedTypedArray(2, numVertices);
		const indices   = webglUtils.createAugmentedTypedArray(3, warpDivides * weftDivides * 2, Uint16Array);

		
		for (let y = 0; y <= weftDivides; y++) {
			for (let x = 0; x <= warpDivides; x++) {
				// Generate a vertex based on its spherical coordinates
				const u = x / warpDivides;
				const v = y / weftDivides;
				const phi = latitudeRange * v + startLatitude;
				const theta = longitutdeRange* u + startLongitude;
				const sinPhi = Math.sin(phi);
				const cosPhi = Math.cos(phi);
				const sinTheta = Math.sin(theta);
				const cosTheta = Math.cos(theta);
				const unitX = cosTheta * sinPhi;
				const unitY = cosPhi;
				const unitZ = sinTheta * sinPhi;
				positions.push(radius * unitX, radius * unitY, radius * unitZ);
				normals.push(unitX, unitY, unitZ);
				texCoords.push(1 - u, v);
			}
		}
	
		for (let x = 0; x < warpDivides; x++) {
			for (let y = 0; y < weftDivides; y++) {
				indices.push(
						(y + 0) * (warpDivides + 1) + x,
						(y + 0) * (warpDivides + 1) + x + 1,
						(y + 1) * (warpDivides + 1) + x
				);
				indices.push(
						(y + 1) * (warpDivides + 1) + x,
						(y + 0) * (warpDivides + 1) + x + 1,
						(y + 1) * (warpDivides + 1) + x + 1)
				;
			}
		}
	
		return {
			position: positions,
			normal: normals,
			texcoord: texCoords,
			indices: indices,
		};
	}

	/**
	 * Creates vertices for a truncated cone, which is like a cylinder
	 * except that it has different top and bottom radii. A truncated cone
	 * can also be used to create cylinders and regular cones. The
	 * truncated cone will be created centered about the origin, with the
	 * y axis as its vertical axis. The created cone has position, normal
	 * and uv streams.
	 *
 	 * @param {number} topRadius				Top radius of truncated cone.
	 * @param {number} bottomRadius				Bottom radius of truncated cone.
	 * @param {number} height					Height of truncated cone.
	 * @param {number} [opt_radialDivides]		The number of subdivisions around the
	 *     truncated cone.
	 * @param {number} [opt_verticalDivides]	The number of subdivisions down the
	 *     truncated cone.
	 * @param {boolean} [opt_topCap]			Create top cap. Default = true.
	 * @param {boolean} [opt_bottomCap]			Create bottom cap. Default = true.
	 * @return {Object.<string, TypedArray>} 	The created plane vertices.
	 * @memberOf module:primitives
	 */
	function createTruncatedConeVertices(
		topRadius,
		bottomRadius,
		height,
		opt_radialDivides,
		opt_verticalDivides,
		opt_topCap,
		opt_bottomCap) {
		const radialDivides		= (!opt_radialDivides	|| opt_radialDivides < 3) ? 60 : opt_radialDivides;
		const verticalDivides	= (!opt_verticalDivides	|| opt_verticalDivides < 1) ? 1 : opt_verticalDivides;
		const topCap = (opt_topCap === undefined) ? true : opt_topCap;
		const bottomCap = (opt_bottomCap === undefined) ? true : opt_bottomCap;
		const extra = (topCap ? 2 : 0) + (bottomCap ? 2 : 0);
		const numVertices = (radialDivides + 1) * (verticalDivides + 1 + extra);
		
		const positions = webglUtils.createAugmentedTypedArray(3, numVertices);
		const normals   = webglUtils.createAugmentedTypedArray(3, numVertices);
		const texCoords = webglUtils.createAugmentedTypedArray(2, numVertices);
		const indices   = webglUtils.createAugmentedTypedArray(3, radialDivides * (verticalDivides + extra) * 2, Uint16Array);

		const start = topCap ? -2 : 0;
	 	const end = (bottomCap ? 2 : 0) + verticalDivides;
		const slant = Math.atan2(bottomRadius - topRadius, height);
		const sinSlant = Math.sin(slant);
		const cosSlant = Math.cos(slant);
		
		for (let i = start; i <= end; i++) {
			let v = i / verticalDivides;
			let y = height * v;
			let ringRadius;
			if (i < 0) {
				y = 0;
				v = 1;
				ringRadius = bottomRadius;
			} else if (i > verticalDivides) {
				y = height;
				v = 1;
				ringRadius = topRadius;
			} else {
				ringRadius = bottomRadius + (topRadius - bottomRadius) * (i / verticalDivides);
			}
			if (i === -2 || i === verticalDivides + 2) {
				ringRadius = 0;
				v = 0;
			}
			y -= height / 2;
			for (let j = 0; j < (radialDivides + 1); j++) {
				const theta = j * Math.PI * 2 / radialDivides;
				const sinTheta = Math.sin(theta);
				const cosTheta = Math.cos(theta);
				positions.push(sinTheta * ringRadius, y, cosTheta * ringRadius);
				normals.push(
					(i < 0 || i > verticalDivides) ? 0 : (sinTheta * cosSlant),
					(i < 0) ? -1 : (i > verticalDivides ? 1 : sinSlant),
					(i < 0 || i > verticalDivides) ? 0 : (cosTheta * cosSlant));
				texCoords.push((j / radialDivides), 1 - v);
			}
		  }
	
		for (let i = 0; i < verticalDivides + extra; i++) {
			for (let j = 0; j < radialDivides; j++) {
				indices.push(
					(radialDivides + 1) * (i + 0) + j + 0,
					(radialDivides + 1) * (i + 0) + j + 1,
					(radialDivides + 1) * (i + 1) + j + 1
				);
				indices.push(
					(radialDivides + 1) * (i + 0) + j + 0,
					(radialDivides + 1) * (i + 1) + j + 1,
					(radialDivides + 1) * (i + 1) + j + 0
				);
			}
		}

		return {
			position: positions,
			normal: normals,
			texcoord: texCoords,
			indices: indices,
		};
	}


	function createFlattenedFunc(vertFunc) {
		return function(gl, ...args) {
			let vertices = vertFunc(...args);
			vertices = deindexVertices(vertices);
			vertices = makeRandomVertexColors(vertices, {
					vertsPerColor: 6,
					rand: function(ndx, channel) {
						// return channel < 3 ? ((128 + Math.random() * 128) | 0) : 255;
						return 255;
					},
				});
			return webglUtils.createBufferInfoFromArrays(gl, vertices);
		};
	}



	return {
		createPlaneVertices,
		createPlaneBufferInfo: createBufferInfoFunc(createPlaneVertices),
		createPlaneBuffers: createBufferFunc(createPlaneVertices),
		createPlaneWithVertexColorsBufferInfo: createFlattenedFunc(createPlaneVertices),
		
		createCubeVertices,
		createCubeBufferInfo: createBufferInfoFunc(createCubeVertices),
		createCubeBuffers: createBufferFunc(createCubeVertices),
		createCubeWithVertexColorsBufferInfo: createFlattenedFunc(createCubeVertices),
		
		createSphereVertices,
		createSphereBufferInfo: createBufferInfoFunc(createSphereVertices),
		createSphereBuffers: createBufferFunc(createSphereVertices),
		createSphereWithVertexColorsBufferInfo: createFlattenedFunc(createSphereVertices),
		
		createTruncatedPyramidVertices,
		createTruncatedPyramidBufferInfo: createBufferInfoFunc(createTruncatedPyramidVertices),
		createTruncatedPyramidBuffers: createBufferFunc(createTruncatedPyramidVertices),
		createTruncatedPyramidWithVertexColorsBufferInfo: createFlattenedFunc(createTruncatedPyramidVertices),

		createTruncatedRegularTriangularPyramidVertices,
		createTruncatedRegularTriangularPyramidBufferInfo: createBufferInfoFunc(createTruncatedRegularTriangularPyramidVertices),
		createTruncatedRegularTriangularPyramidBuffers: createBufferFunc(createTruncatedRegularTriangularPyramidVertices),
		createTruncatedRegularTriangularPyramidWithVertexColorsBufferInfo: createFlattenedFunc(createTruncatedRegularTriangularPyramidVertices),

		createTruncatedConeVertices,
		createTruncatedConeBufferInfo: createBufferInfoFunc(createTruncatedConeVertices),
		createTruncatedConeBuffers: createBufferFunc(createTruncatedConeVertices),
		createTruncatedConeWithVertexColorsBufferInfo: createFlattenedFunc(createTruncatedConeVertices),
		
		deindexVertices,
		flattenNormals,
		makeRandomVertexColors,
		reorientDirections,
		reorientNormals,
		reorientPositions,
		reorientVertices,
	};

}));
/**
 * Preset transform matrices for preset clipping planes. 
 * @module preset-planes
 */
 (function(root, factory) {	// eslint-disable-line
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['./3d-math'], factory);
	} else {
		// Browser globals
		root.preplanes = factory.call(root);
	}
} (this, function() {
    "use strict";

	function radToDeg (r) {
		return r * 180 / Math.PI;
	}

	function defaultPlane (length) {
		return {
			xTranslation:	0,	yTranslation: 	0,	zTranslation:	0,
			xRotation:		0,	zRotation:		0
		}
	}

	function cubeEquilateralTriangle (length) {
		const offset = length * (5 / 30);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.acos(Math.sqrt(1 / 5))),
			zRotation:		radToDeg(-Math.asin(2 / 3))
		};
	}

	function cubeIsoscelesTriangle (length) {
		const offset = length * (3 / 10);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 4),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(1 / 3)))
		};
	}

	function cubeAcuteTriangle (length) {
		const offset = length * (115 / 470);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.asin(Math.sqrt(9 / 34))),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(225 / 769)))
		};
	}

	function cubePrismatic (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 4),
			zRotation:		radToDeg(-Math.acos(Math.sqrt(1 / 3)))
		};
	}

	function cubeIsoscelesTrapezoid (length) {
		const offset = length * (5 / 30);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg(-Math.acos(Math.sqrt(1 / 5)) + Math.PI),
			zRotation:		radToDeg(-Math.asin(2 / 3))
		};
	}

	function cubeOrdinaryTrapezoid (length) {
		const offset = length * (65 / 330);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg(-Math.acos(Math.sqrt(1 / 101)) + Math.PI),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(225 / 629)))
		};
	}

	function cubeSquare1 (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 2)
		};
	}

	function cubeSquare2 (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg( 0 )
		};
	}

	function cubeRectangle1 (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 3)
		};
	}

	function cubeRectangle2 (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 4)
		};
	}

	function cubeRectangle3 (length) {
		const offset = length * - (25 / 130);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.acos(Math.sqrt(25 / 89)))
		};
	}

	function cubeParallelogram (length) {
		const offset = length * (0);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.acos(Math.sqrt(1 / 17))),
			zRotation:		radToDeg(-Math.acos(Math.sqrt(17 / 42)))
		};
	}

	function cubeOrdinaryPentagon (length) {
		const offset = length * - (5 / 60);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.asin(Math.sqrt(16 / 41))),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(18 / 100)))
		};
	}

	function cubeOrdinaryHexagon (length) {
		const offset = length * - (25 / 330);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.asin(Math.sqrt(100 / 269))),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(100 / 369)))
		};
	}

	function cubeRegularHexagon (length) {
		const offset = length * (0);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 4),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(1 / 3)))
		};
	}

	function cuboidEquilateralTriangle (length) {
		const offset = length * (8 / 30);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.acos(Math.sqrt(1 / 5))),
			zRotation:		radToDeg(-Math.asin(2 / 3))
		};
	}

	function cuboidIsoscelesTriangle (length) {
		const offset = length * (21 / 50);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 4),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(1 / 3)))
		};
	}

	function cuboidPrismatic (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 4),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(25 / 57)))
		};
	}

	function cuboidIsoscelesTrapezoid (length) {
		const offset = length * (40 / 70);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg(-Math.acos(Math.sqrt(9 / 34)) + Math.PI),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(25 / 59)))
		};
	}

	function cuboidOrdinaryTrapezoid (length) {
		const offset = length * (65 / 330);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg(-Math.acos(Math.sqrt(1 / 101)) + Math.PI),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(225 / 629)))
		};
	}

	function cuboidSquare (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 2)
		};
	}

	function cuboidRectangle1 (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg( 0 )
		};
	}

	function cuboidRectangle2 (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 3)
		};
	}

	function cuboidRectangle3 (length) {
		const offset = length * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.atan(10 / 16))
		};
	}

	function cuboidRectangle4 (length) {
		const offset = length * - (2 / 5);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 3)
		};
	}

	function cuboidParallelogram (length) {
		const offset = length * (0);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.acos(Math.sqrt(1 / 17))),
			zRotation:		radToDeg(-Math.acos(Math.sqrt(17 / 42)))
		};
	}

	function cuboidOrdinaryPentagon (length) {
		const offset = length * - (40 / 1530);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.asin(Math.sqrt(9 / 34))),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(625 / 9329)))
		};
	}

	function cuboidOrdinaryHexagon (length) {
		const offset = length * - (5 / 60);
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.asin(Math.sqrt(16 / 41))),
			zRotation:		radToDeg(-Math.asin(Math.sqrt(18 / 100)))
		};
	}

	function slinderCircle (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg( 0 )
		};
	}

	function slinderEllipse (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 12)
		};
	}

	function slinderCurveStraight1 (height) {
		const offset = height * -(5 / 10);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( Math.PI / 6),
			zRotation:		radToDeg(-Math.PI / 6)
		};
	}

	function slinderCurveStraight2 (height) {
		const offset = height * (5 * (1 - Math.sqrt(13 / 3)) / 10);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( Math.PI / 3),
			zRotation:		radToDeg(-Math.PI / 6)
		};
	}

	function slinderRectangle1 (height) {
		const offset = height * (2 / 10);
		return {
			xTranslation:	 offset,
			yTranslation:	 0,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 2),
			zRotation:		radToDeg(-Math.PI / 4)
		};
	}
	
	function slinderRectangle2 (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 2),
			zRotation:		radToDeg(-Math.PI / 4)
		};
	}

	function slinderDrumShape (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 6),
			zRotation:		radToDeg(-Math.PI / 4)
		};
	}

	function coneCircle (height) {
		const offset = height * - (1 / 10);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg( 0 )
		};
	}

	function coneEllipse (height) {
		const offset = height * - (1 / 10);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 12)
		};
	}

	function coneCurveStraight (height) {
		const offset = height * -(5 / 10);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( Math.PI / 4),
			zRotation:		radToDeg(-Math.PI / 3)
		};
	}

	function coneIsoscelesTriangle (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 2),
			zRotation:		radToDeg(-Math.PI / 3)
		};
	}

	function truncatedConeCircle (height) {
		const offset = height * - (1 / 10);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg( 0 )
		};
	}

	function truncatedConeEllipse (height) {
		const offset = height * - (1 / 10);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 12)
		};
	}

	function truncatedConeCurveStraight (height) {
		const offset = height * -(5 / 10);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( Math.PI / 4),
			zRotation:		radToDeg(-Math.PI / 3)
		};
	}

	function truncatedConeIsoscelesTrapezoid (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 2),
			zRotation:		radToDeg(-Math.PI / 3)
		};
	}

	function prismTriangle1 (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg( 0 )
		};
	}

	function prismTriangle2 (height) {
		const offset = height * - (5 / 30);
		return {
			xTranslation:	 0,
			yTranslation:	 offset,
			zTranslation:	 0,
			xRotation:		radToDeg( Math.asin(Math.sqrt(4 / 7))),
			zRotation:		radToDeg( 0 )
		};
	}

	function prismRectangle1 (height) {
		const offset = height * (5 / 30);
		return {
			xTranslation:	 offset,
			yTranslation:	 0,
			zTranslation:	 0,
			xRotation:		radToDeg( Math.PI / 2),
			zRotation:		radToDeg(-Math.PI / 3)
		};
	}

	function prismRectangle2 (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( 0 ),
			zRotation:		radToDeg(-Math.PI / 2)
		};
	}

	function prismTrapezoid (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 3),
			zRotation:		radToDeg( 0 )
		};
	}

	function prismOrdinaryPentagon (height) {
		const offset = height * 0;
		return {
			xTranslation:	 offset,
			yTranslation:	 offset,
			zTranslation:	 offset,
			xRotation:		radToDeg( Math.PI / 3),
			zRotation:		radToDeg(-Math.PI / 6)
		};
	}

    return {
		"cube": {
			isoscelesTriangle:	 cubeIsoscelesTriangle,
			equilateralTriangle: cubeEquilateralTriangle,
			acuteTriangle:		 cubeAcuteTriangle,
			prismatic:			 cubePrismatic,
			isoscelesTrapezoid:	 cubeIsoscelesTrapezoid,
			ordinaryTrapezoid:	 cubeOrdinaryTrapezoid,
			square1:			 cubeSquare1,
			square2:			 cubeSquare2,
			rectangle1:			 cubeRectangle1,
			rectangle2:			 cubeRectangle2,
			rectangle3:			 cubeRectangle3,
			parallelogram:		 cubeParallelogram,
			ordinaryPentagon:	 cubeOrdinaryPentagon,
			ordinaryHexagon:	 cubeOrdinaryHexagon,
			regularHexagon:		 cubeRegularHexagon,
			default:			 defaultPlane
		},
		"cuboid": {
			isoscelesTriangle:	 cuboidIsoscelesTriangle,
			equilateralTriangle: cuboidEquilateralTriangle,
			prismatic:			 cuboidPrismatic,
			isoscelesTrapezoid:	 cuboidIsoscelesTrapezoid,
			ordinaryTrapezoid:	 cuboidOrdinaryTrapezoid,
			square:				 cuboidSquare,
			rectangle1:			 cuboidRectangle1,
			rectangle2:			 cuboidRectangle2,
			rectangle3:			 cuboidRectangle3,
			rectangle4:			 cuboidRectangle4,
			parallelogram:		 cuboidParallelogram,
			ordinaryPentagon:	 cuboidOrdinaryPentagon,
			ordinaryHexagon:	 cuboidOrdinaryHexagon,
			default:			 defaultPlane
		},
		"cylinder": {
			circle: 			 slinderCircle,
			ellipse:			 slinderEllipse,
			curveStraight1:		 slinderCurveStraight1,
			curveStraight2:		 slinderCurveStraight2,
			rectangle1:			 slinderRectangle1,
			rectangle2:			 slinderRectangle2,
			drumShape:			 slinderDrumShape,
			default:			 defaultPlane
		},
		"cone": {
			circle:				 coneCircle,
			ellipse:			 coneEllipse,
			curveStraight:		 coneCurveStraight,
			isoscelesTriangle:	 coneIsoscelesTriangle,
			default:			 defaultPlane
		},
		"trun-cone": {
			circle:				 truncatedConeCircle,
			ellipse:			 truncatedConeEllipse,
			curveStraight:		 truncatedConeCurveStraight,
			isoscelesTrapezoid:	 truncatedConeIsoscelesTrapezoid,
			default:			 defaultPlane
		},
		"prism": {
			triangle1:			 prismTriangle1,
			triangle2:			 prismTriangle2,
			rectangle1:			 prismRectangle1,
			rectangle2:			 prismRectangle2,
			trapezoid:			 prismTrapezoid,
			ordinaryPentagon:	 prismOrdinaryPentagon,
			default:			 defaultPlane
		},
		"complex": {
			default:			defaultPlane
		}
    }
}));
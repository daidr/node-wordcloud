const { createCanvas } = require('canvas');

const { NumberLinearMap, getDataValueExtent, shuffleArray } = require('./utils');

module.exports = (_createCanvas = createCanvas) => {
    // 检查 node-wordcloud 是否能够在该 canvas 实现上运行
    const isSupported = (function isSupported() {
        const canvas = _createCanvas();
        if (!canvas || !canvas.getContext) {
            return false
        }

        const ctx = canvas.getContext('2d')
        if (!ctx) {
            return false
        }
        if (!ctx.getImageData) {
            return false
        }
        if (!ctx.fillText) {
            return false
        }

        if (!Array.prototype.some) {
            return false
        }
        if (!Array.prototype.push) {
            return false
        }

        return true
    }())

    // 检测该canvas支持的最小字体大小
    const minFontSize = (function getMinFontSize() {
        if (!isSupported) {
            return
        }

        const ctx = _createCanvas().getContext('2d')

        // start from 20
        let size = 20

        // two sizes to measure
        let hanWidth, mWidth

        while (size) {
            ctx.font = size.toString(10) + 'px sans-serif'
            if ((ctx.measureText('\uFF37').width === hanWidth) &&
                (ctx.measureText('m').width) === mWidth) {
                return (size + 1)
            }

            hanWidth = ctx.measureText('\uFF37').width
            mWidth = ctx.measureText('m').width

            size--
        }

        return 0
    })()

    const getItemExtraData = function (item) {
        if (Array.isArray(item)) {
            const itemCopy = item.slice()
            // remove data we already have (word and weight)
            itemCopy.splice(0, 2)
            return itemCopy
        } else {
            return []
        }
    }

    const WordCloud = function (element, options) {
        if (!isSupported) {
            return;
        }

        /* Default values to be overwritten by options object */
        const settings = {
            list: [],
            fontFamily: '"Trebuchet MS", "Heiti TC", "微軟正黑體", ' +
                '"Arial Unicode MS", "Droid Fallback Sans", sans-serif',
            fontWeight: 'normal',
            color: 'random-dark',
            minSize: 0,
            sizeRange: [16, 68],
            backgroundColor: '#fff',

            gridSize: 8,
            drawOutOfBound: false,
            shrinkToFit: false,
            origin: null,

            drawMask: false,
            maskColor: 'rgba(255,0,0,0.3)',
            maskGapWidth: 0.3,

            abortThreshold: 0,
            abort: function noop() { },

            rotationRange: [-70, 70],
            rotationSteps: 14,

            shuffle: true,
            rotateRatio: 0.1,

            shape: 'circle',
            ellipticity: 0.85,
        };

        if (options) {
            for (let key in options) {
                if (key in settings) {
                    settings[key] = options[key];
                }
            }
        }

        /* Convert shape into a function */
        if (typeof settings.shape !== 'function') {
            switch (settings.shape) {
                case 'circle':
                /* falls through */
                default:
                    // 'circle' is the default and a shortcut in the code loop.
                    settings.shape = 'circle';
                    break;

                case 'cardioid':
                    settings.shape = function shapeCardioid(theta) {
                        return 1 - Math.sin(theta);
                    };
                    break;

                /*
                To work out an X-gon, one has to calculate "m",
                where 1/(cos(2*PI/X)+m*sin(2*PI/X)) = 1/(cos(0)+m*sin(0))
                http://www.wolframalpha.com/input/?i=1%2F%28cos%282*PI%2FX%29%2Bm*sin%28
                2*PI%2FX%29%29+%3D+1%2F%28cos%280%29%2Bm*sin%280%29%29
                Copy the solution into polar equation r = 1/(cos(t') + m*sin(t'))
                where t' equals to mod(t, 2PI/X)
               */
                case 'diamond':
                    // http://www.wolframalpha.com/input/?i=plot+r+%3D+1%2F%28cos%28mod+
                    // %28t%2C+PI%2F2%29%29%2Bsin%28mod+%28t%2C+PI%2F2%29%29%29%2C+t+%3D
                    // +0+..+2*PI
                    settings.shape = function shapeSquare(theta) {
                        const thetaPrime = theta % (2 * Math.PI / 4);
                        return 1 / (Math.cos(thetaPrime) + Math.sin(thetaPrime));
                    };
                    break;

                case 'square':
                    // http://www.wolframalpha.com/input/?i=plot+r+%3D+min(1%2Fabs(cos(t
                    // )),1%2Fabs(sin(t)))),+t+%3D+0+..+2*PI
                    settings.shape = function shapeSquare(theta) {
                        return Math.min(
                            1 / Math.abs(Math.cos(theta)),
                            1 / Math.abs(Math.sin(theta))
                        );
                    };
                    break;

                case 'triangle-forward':
                    // http://www.wolframalpha.com/input/?i=plot+r+%3D+1%2F%28cos%28mod+
                    // %28t%2C+2*PI%2F3%29%29%2Bsqrt%283%29sin%28mod+%28t%2C+2*PI%2F3%29
                    // %29%29%2C+t+%3D+0+..+2*PI
                    settings.shape = function shapeTriangle(theta) {
                        const thetaPrime = theta % (2 * Math.PI / 3);
                        return 1 / (Math.cos(thetaPrime) +
                            Math.sqrt(3) * Math.sin(thetaPrime));
                    };
                    break;

                case 'triangle':
                case 'triangle-upright':
                    settings.shape = function shapeTriangle(theta) {
                        const thetaPrime = (theta + Math.PI * 3 / 2) % (2 * Math.PI / 3);
                        return 1 / (Math.cos(thetaPrime) +
                            Math.sqrt(3) * Math.sin(thetaPrime));
                    };
                    break;

                case 'pentagon':
                    settings.shape = function shapePentagon(theta) {
                        const thetaPrime = (theta + 0.955) % (2 * Math.PI / 5);
                        return 1 / (Math.cos(thetaPrime) +
                            0.726543 * Math.sin(thetaPrime));
                    };
                    break;

                case 'star':
                    settings.shape = function shapeStar(theta) {
                        const thetaPrime = (theta + 0.955) % (2 * Math.PI / 10);
                        if ((theta + 0.955) % (2 * Math.PI / 5) - (2 * Math.PI / 10) >= 0) {
                            return 1 / (Math.cos((2 * Math.PI / 10) - thetaPrime) +
                                3.07768 * Math.sin((2 * Math.PI / 10) - thetaPrime));
                        } else {
                            return 1 / (Math.cos(thetaPrime) +
                                3.07768 * Math.sin(thetaPrime));
                        }
                    };
                    break;
            }
        }

        /* Make sure gridSize is a whole number and is not smaller than 4px */
        settings.gridSize = Math.max(Math.floor(settings.gridSize), 4);

        /* shorthand */
        const g = settings.gridSize;
        const maskRectWidth = g - settings.maskGapWidth;

        /* normalize rotation settings */
        settings.rotationRange[0] = settings.rotationRange[0] * Math.PI / 180;
        settings.rotationRange[1] = settings.rotationRange[1] * Math.PI / 180;
        const rotationRange = Math.abs(settings.rotationRange[0] - settings.rotationRange[1]);
        const rotationSteps = Math.abs(Math.floor(settings.rotationSteps));
        const minRotation = Math.min(settings.rotationRange[0], settings.rotationRange[1]);

        /* information/object available to all functions, set when start() */
        let grid, // 2d array containing filling information
            ngx, ngy, // width and height of the grid
            center, // position of the center of the cloud
            maxRadius;

        /* timestamp for measuring each putWord() action */
        let escapeTime;

        /* function for getting the color of the text */
        let getTextColor;
        function randomHslColor(min, max) {
            return 'hsl(' +
                (Math.random() * 360).toFixed() + ',' +
                (Math.random() * 30 + 70).toFixed() + '%,' +
                (Math.random() * (max - min) + min).toFixed() + '%)';
        }
        switch (settings.color) {
            case 'random-dark':
                getTextColor = function getRandomDarkColor() {
                    return randomHslColor(10, 50);
                };
                break;

            case 'random-light':
                getTextColor = function getRandomLightColor() {
                    return randomHslColor(50, 90);
                };
                break;

            default:
                if (typeof settings.color === 'function') {
                    getTextColor = settings.color;
                }
                break;
        }

        /* function for getting the font-weight of the text */
        let getTextFontWeight;
        if (typeof settings.fontWeight === 'function') {
            getTextFontWeight = settings.fontWeight;
        }

        /* Get points on the grid for a given radius away from the center */
        const pointsAtRadius = [];
        const getPointsAtRadius = function getPointsAtRadius(radius) {
            if (pointsAtRadius[radius]) {
                return pointsAtRadius[radius];
            }

            // Look for these number of points on each radius
            const T = radius * 8;

            // Getting all the points at this radius
            let t = T;
            const points = [];

            if (radius === 0) {
                points.push([center[0], center[1], 0]);
            }

            while (t--) {
                // distort the radius to put the cloud in shape
                let rx = 1;
                if (settings.shape !== 'circle') {
                    rx = settings.shape(t / T * 2 * Math.PI); // 0 to 1
                }

                // Push [x, y, t] t is used solely for getTextColor()
                points.push([
                    center[0] + radius * rx * Math.cos(-t / T * 2 * Math.PI),
                    center[1] + radius * rx * Math.sin(-t / T * 2 * Math.PI) *
                    settings.ellipticity,
                    t / T * 2 * Math.PI
                ]);
            }

            pointsAtRadius[radius] = points;
            return points;
        };

        /* Return true if we had spent too much time */
        const exceedTime = function exceedTime() {
            return ((settings.abortThreshold > 0) &&
                ((new Date()).getTime() - escapeTime > settings.abortThreshold));
        };

        /* Get the deg of rotation according to settings, and luck. */
        const getRotateDeg = function getRotateDeg() {
            if (settings.rotateRatio === 0) {
                return 0;
            }

            if (Math.random() > settings.rotateRatio) {
                return 0;
            }

            if (rotationRange === 0) {
                return minRotation;
            }

            if (rotationSteps > 0) {
                // Min rotation + zero or more steps * span of one step
                return minRotation +
                    Math.floor(Math.random() * rotationSteps) *
                    rotationRange / (rotationSteps - 1);
            } else {
                return minRotation + Math.random() * rotationRange;
            }
        };

        const weightFactor = (weight) => {
            if (!settings.list.valueExtent) {
                settings.list.valueExtent = getDataValueExtent(settings.list);
            }
            return NumberLinearMap(weight, settings.list.valueExtent, settings.sizeRange);
        };

        const getTextInfo = function getTextInfo(word, weight, rotateDeg, extraDataArray) {
            const fcanvas = _createCanvas();
            const fctx = fcanvas.getContext('2d', { willReadFrequently: true });

            // calculate the acutal font size
            // fontSize === 0 means weightFactor function wants the text skipped,
            // and size < minSize means we cannot draw the text.
            const fontSize = weightFactor(weight);
            if (fontSize <= settings.minSize) {
                return false;
            }

            // Scale factor here is to make sure fillText is not limited by
            // the minium font size set by browser.
            // It will always be 1 or 2n.
            let mu = 1;
            if (fontSize < minFontSize) {
                mu = (function calculateScaleFactor() {
                    var mu = 2;
                    while (mu * fontSize < minFontSize) {
                        mu += 2;
                    }
                    return mu;
                })();
            }

            // Get fontWeight that will be used to set fctx.font
            let fontWeight;
            if (getTextFontWeight) {
                fontWeight = getTextFontWeight(word, weight, fontSize, extraDataArray);
            } else {
                fontWeight = settings.fontWeight;
            }

            fctx.font = fontWeight + ' ' +
                (fontSize * mu).toString(10) + 'px ' + settings.fontFamily;

            // Estimate the dimension of the text with measureText().
            const fw = fctx.measureText(word).width / mu;
            const fh = Math.max(fontSize * mu,
                fctx.measureText('m').width,
                fctx.measureText('\uFF37').width
            ) / mu;

            // Create a boundary box that is larger than our estimates,
            // so text don't get cut of (it sill might)
            let boxWidth = fw + fh * 2;
            let boxHeight = fh * 3;
            const fgw = Math.ceil(boxWidth / g);
            const fgh = Math.ceil(boxHeight / g);
            boxWidth = fgw * g;
            boxHeight = fgh * g;

            // Calculate the proper offsets to make the text centered at
            // the preferred position.
            // This is simply half of the width.
            const fillTextOffsetX = -fw / 2;
            // Instead of moving the box to the exact middle of the preferred
            // position, for Y-offset we move 0.4 instead, so Latin alphabets look
            // vertical centered.
            const fillTextOffsetY = -fh * 0.4;

            // Calculate the actual dimension of the canvas, considering the rotation.
            const cgh = Math.ceil((boxWidth * Math.abs(Math.sin(rotateDeg)) +
                boxHeight * Math.abs(Math.cos(rotateDeg))) / g);
            const cgw = Math.ceil((boxWidth * Math.abs(Math.cos(rotateDeg)) +
                boxHeight * Math.abs(Math.sin(rotateDeg))) / g);
            const width = cgw * g;
            const height = cgh * g;

            fcanvas.width = width;
            fcanvas.height = height;

            // Scale the canvas with |mu|.
            fctx.scale(1 / mu, 1 / mu);
            fctx.translate(width * mu / 2, height * mu / 2);
            fctx.rotate(-rotateDeg);

            // Once the width/height is set, ctx info will be reset.
            // Set it again here.
            fctx.font = fontWeight + ' ' +
                (fontSize * mu).toString(10) + 'px ' + settings.fontFamily;

            // Fill the text into the fcanvas.
            // XXX: We cannot because textBaseline = 'top' here because
            // Firefox and Chrome uses different default line-height for canvas.
            // Please read https://bugzil.la/737852#c6.
            // Here, we use textBaseline = 'middle' and draw the text at exactly
            // 0.5 * fontSize lower.
            fctx.fillStyle = '#000';
            fctx.textBaseline = 'middle';
            fctx.fillText(
                word, fillTextOffsetX * mu,
                (fillTextOffsetY + fontSize * 0.5) * mu
            );

            // Get the pixels of the text
            const imageData = fctx.getImageData(0, 0, width, height).data;

            if (exceedTime()) {
                return false;
            }

            // Read the pixels and save the information to the occupied array
            const occupied = [];
            let gx = cgw;
            let gy, x, y;
            let bounds = [cgh / 2, cgw / 2, cgh / 2, cgw / 2];
            while (gx--) {
                gy = cgh;
                while (gy--) {
                    y = g;
                    /* eslint no-labels: ["error", { "allowLoop": true }] */
                    singleGridLoop: while (y--) {
                        x = g;
                        while (x--) {
                            if (imageData[((gy * g + y) * width +
                                (gx * g + x)) * 4 + 3]) {
                                occupied.push([gx, gy]);

                                if (gx < bounds[3]) {
                                    bounds[3] = gx;
                                }
                                if (gx > bounds[1]) {
                                    bounds[1] = gx;
                                }
                                if (gy < bounds[0]) {
                                    bounds[0] = gy;
                                }
                                if (gy > bounds[2]) {
                                    bounds[2] = gy;
                                }
                                break singleGridLoop;
                            }
                        }
                    }
                }
            }

            // Return information needed to create the text on the real canvas
            return {
                mu,
                occupied,
                bounds,
                gw: cgw,
                gh: cgh,
                fillTextOffsetX,
                fillTextOffsetY,
                fillTextWidth: fw,
                fillTextHeight: fh,
                fontSize
            };
        };

        /* Determine if there is room available in the given dimension */
        const canFitText = function canFitText(gx, gy, gw, gh, occupied) {
            // Go through the occupied points,
            // return false if the space is not available.
            let i = occupied.length;
            while (i--) {
                var px = gx + occupied[i][0];
                var py = gy + occupied[i][1];

                if (px >= ngx || py >= ngy || px < 0 || py < 0) {
                    if (!settings.drawOutOfBound) {
                        return false;
                    }
                    continue;
                }

                if (!grid[px][py]) {
                    return false;
                }
            }
            return true;
        };

        /* Actually draw the text on the grid */
        const drawText = function drawText(gx, gy, info, word, weight, distance, theta, rotateDeg, attributes, extraDataArray) {
            const fontSize = info.fontSize;
            let color;
            if (getTextColor) {
                color = getTextColor(word, weight, fontSize, distance, theta, extraDataArray);
            } else {
                color = settings.color;
            }

            // get fontWeight that will be used to set ctx.font and font style rule
            let fontWeight;
            if (getTextFontWeight) {
                fontWeight = getTextFontWeight(word, weight, fontSize, extraDataArray);
            } else {
                fontWeight = settings.fontWeight;
            }

            {
                var ctx = element.getContext('2d');
                var mu = info.mu;

                // Save the current state before messing it
                ctx.save();
                ctx.scale(1 / mu, 1 / mu);

                ctx.font = fontWeight + ' ' +
                    (fontSize * mu).toString(10) + 'px ' + settings.fontFamily;
                ctx.fillStyle = color;

                // Translate the canvas position to the origin coordinate of where
                // the text should be put.
                ctx.translate(
                    (gx + info.gw / 2) * g * mu,
                    (gy + info.gh / 2) * g * mu
                );

                if (rotateDeg !== 0) {
                    ctx.rotate(-rotateDeg);
                }

                // Finally, fill the text.
                // XXX: We cannot because textBaseline = 'top' here because
                // Firefox and Chrome uses different default line-height for canvas.
                // Please read https://bugzil.la/737852#c6.
                // Here, we use textBaseline = 'middle' and draw the text at exactly
                // 0.5 * fontSize lower.
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    word, info.fillTextOffsetX * mu,
                    (info.fillTextOffsetY + fontSize * 0.5) * mu
                );

                // The below box is always matches how <span>s are positioned
                /* ctx.strokeRect(info.fillTextOffsetX, info.fillTextOffsetY,
                  info.fillTextWidth, info.fillTextHeight) */
                // Restore the state.
                ctx.restore();
            }
        };

        /* Help function to updateGrid */
        const fillGridAt = function fillGridAt(x, y, drawMask) {
            if (x >= ngx || y >= ngy || x < 0 || y < 0) {
                return;
            }

            grid[x][y] = false;

            if (drawMask) {
                const ctx = element.getContext('2d');
                ctx.fillRect(x * g, y * g, maskRectWidth, maskRectWidth);
            }
        };

        /* Update the filling information of the given space with occupied points.
           Draw the mask on the canvas if necessary. */
        const updateGrid = function updateGrid(gx, gy, gw, gh, info) {
            const occupied = info.occupied;
            const drawMask = settings.drawMask;
            let ctx;
            if (drawMask) {
                ctx = element.getContext('2d');
                ctx.save();
                ctx.fillStyle = settings.maskColor;
            }

            let i = occupied.length;
            while (i--) {
                const px = gx + occupied[i][0];
                const py = gy + occupied[i][1];

                if (px >= ngx || py >= ngy || px < 0 || py < 0) {
                    continue;
                }

                fillGridAt(px, py, drawMask);
            }

            if (drawMask) {
                ctx.restore();
            }
        };

        /* putWord() processes each item on the list,
           calculate it's size and determine it's position, and actually
           put it on the canvas. */
        const putWord = function putWord(item) {
            let word, weight, attributes;
            if (Array.isArray(item)) {
                word = item[0];
                weight = item[1];
            } else {
                word = item.word;
                weight = item.weight;
                attributes = item.attributes;
            }
            const rotateDeg = getRotateDeg();

            const extraDataArray = getItemExtraData(item);

            // get info needed to put the text onto the canvas
            const info = getTextInfo(word, weight, rotateDeg, extraDataArray);

            // not getting the info means we shouldn't be drawing this one.
            if (!info) {
                return false;
            }

            if (exceedTime()) {
                return false;
            }

            // If drawOutOfBound is set to false,
            // skip the loop if we have already know the bounding box of
            // word is larger than the canvas.
            if (!settings.drawOutOfBound && !settings.shrinkToFit) {
                var bounds = info.bounds;
                if ((bounds[1] - bounds[3] + 1) > ngx ||
                    (bounds[2] - bounds[0] + 1) > ngy) {
                    return false;
                }
            }

            // Determine the position to put the text by
            // start looking for the nearest points
            let r = maxRadius + 1;

            const tryToPutWordAtPoint = function (gxy) {
                const gx = Math.floor(gxy[0] - info.gw / 2);
                const gy = Math.floor(gxy[1] - info.gh / 2);
                const gw = info.gw;
                const gh = info.gh;

                // If we cannot fit the text at this position, return false
                // and go to the next position.
                if (!canFitText(gx, gy, gw, gh, info.occupied)) {
                    return false;
                }

                // Actually put the text on the canvas
                drawText(gx, gy, info, word, weight,
                    (maxRadius - r), gxy[2], rotateDeg, attributes, extraDataArray);

                // Mark the spaces on the grid as filled
                updateGrid(gx, gy, gw, gh, info);

                // Return true so some() will stop and also return true.
                return true;
            };

            while (r--) {
                let points = getPointsAtRadius(maxRadius - r);

                if (settings.shuffle) {
                    points = [].concat(points);
                    shuffleArray(points);
                }

                // Try to fit the words by looking at each point.
                // array.some() will stop and return true
                // when putWordAtPoint() returns true.
                // If all the points returns false, array.some() returns false.
                const drawn = points.some(tryToPutWordAtPoint);

                if (drawn) {
                    // leave putWord() and return true
                    return true;
                }
            }
            if (settings.shrinkToFit) {
                if (Array.isArray(item)) {
                    item[1] = item[1] * 3 / 4;
                } else {
                    item.weight = item.weight * 3 / 4;
                }
                return putWord(item);
            }
            // we tried all distances but text won't fit, return false
            return false;
        };

        /* Start drawing on a canvas */
        const start = function start() {
            const canvas = element;

            ngx = Math.ceil(canvas.width / g);
            ngy = Math.ceil(canvas.height / g);

            // Determine the center of the word cloud
            center = (settings.origin)
                ? [settings.origin[0] / g, settings.origin[1] / g]
                : [ngx / 2, ngy / 2];

            // Maxium radius to look for space
            maxRadius = Math.floor(Math.sqrt(ngx * ngx + ngy * ngy));

            grid = [];

            let gx, gy;

            const ctx = element.getContext('2d');
            ctx.fillStyle = settings.backgroundColor;
            ctx.clearRect(0, 0, ngx * (g + 1), ngy * (g + 1));
            ctx.fillRect(0, 0, ngx * (g + 1), ngy * (g + 1));

            /* fill the grid with empty state */
            gx = ngx;
            while (gx--) {
                grid[gx] = [];
                gy = ngy;
                while (gy--) {
                    grid[gx][gy] = true;
                }
            }

            for (let i = 0; i < settings.list.length; i++) {
                if (i >= settings.list.length) {
                    return;
                }
                escapeTime = (new Date()).getTime();
                putWord(settings.list[i]);
                if (exceedTime()) {
                    settings.abort();
                    return;
                }
            }
        };
        return {
            updateList(list) {
                settings.list = list;
            },
            draw() {
                start();
            }
        };

    }

    WordCloud.isSupported = isSupported
    WordCloud.minFontSize = minFontSize

    return WordCloud;
}

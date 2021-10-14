import React, { Component, useRef } from 'react';
import { Text, View, Platform, StyleSheet, Dimensions } from 'react-native';
import Canvas, { Image as CanvasImage } from 'react-native-canvas';
import { generateStyle } from '../styles/styles';
import Point from "../classes/Point";
import { Asset } from 'expo-asset';
import {
	sendStroke,
	sendStrokeEnd,
	sendStrokeStart,
} from '../api/websocketApi.js';
import brushTypes from "../constants/brushTypes.js"
import userBrushes from "../constants/userBrushes.js"
var device = Dimensions.get('window');


const styles = StyleSheet.create(generateStyle(device));


export default class UserCanvas extends Component {


	state = {
		strokes: [],
		imageBrush: 'data:image/png;base64,', // raw image data of the image brush
	}

	hexToRGB = (hex, alpha) => {

		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);

		if (alpha) {
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}

		return `rgb(${r}, ${g}, ${b})`;
	}

	myRand = (min, max) => {
		return Math.random() * (max - min) + min;
	}
	myRand2 = (val, range) => {
		return this.myRand(val - range * val, val + range * val)
	}

	constructor(props) {
		super(props);
		this.handleCanvas = this.handleCanvas.bind(this);
		this.thickness = props.thickness
		this.color = props.color
		this.canvasRef = null;
		this.width = props.width;
		this.height = props.height;
		this.canvasOpacity = props.canvasOpacity;

		this.state = {
			strokes: [],
			imageBrush: 'data:image/png;base64,', // raw image data of the image brush
		}
		this.clearCanvas = this.clearCanvas.bind(this);
	}

	componentDidMount() {
		this.props.setClickClear(this.clearCanvas);
	 }

	componentDidUpdate(prevProps) {
		let currentComponent = this;
		// If user changed the brush type to image brush changed color, request a new brush image
		if (this.props.brushType === brushTypes.USER && 
			(this.props.userBrushType === userBrushes.IMAGE_BRUSH &&
			prevProps.userBrushType !== userBrushes.IMAGE_BRUSH) ||
			prevProps.color !== this.props.color) {
				console.log("FETCHING NOW")

				fetch("http://localhost:8000/makeBrush",
					{
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json'
						},
						method: "POST",
						body: JSON.stringify(
							{
								"brushType": this.props.userBrushType,
								"color": this.props.color
							})
					})
					.then(function (res) {
						res.json().then(parsedJson => {
							// image.src = asset.uri ;
							currentComponent.setState((prevState, props) => {
								return {
								...prevState,
								imageBrush: parsedJson.data.imageData
							}})
					  

						})


					})
					.catch(function (res) { console.log(res) })

			}

		// Update collaborator's drawings
		// DEPRECATED FOR NOW
		// if (prevProps.otherStrokes != this.props.otherStrokes) {
		// 	//   console.log("collaborator", prevProps.otherStrokes, "new:", this.props.otherStrokes)
		// 	if (this.props.otherStrokes.length > 0) {
		// 		var newStroke = this.props.otherStrokes[this.props.otherStrokes.length - 1]
		// 		this.updateCanvas(newStroke, "other")
		// 	}
		// }
	}

	onDrawMove = (event) => {
		console.log("BTYPE IS", this.props.userBrushType)
		// Disable drawing on this canvas if brush type not selected
		if (this.props.brushType !== brushTypes.USER) {
			return;
		}
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		var p = new Point(posX, posY, this.props.thickness, this.hexToRGB(this.props.color, 0.8), "move")
		this.updateCanvas(p, "self")

		// var q = new Point(posX, posY, this.props.thickness, this.hexToRGB(this.props.color,0.9), "move")
		// q.offset = this.props.thickness*0.5
		// this.updateCanvas(q, "self")

		// var q = new Point(posX, posY, this.props.thickness*0.4, this.hexToRGB(this.props.color,0.9), "move")
		// q.offset = -this.props.thickness*0.4
		// this.updateCanvas(q, "self")

		// var q = new Point(posX, posY, this.props.thickness*0.4, this.hexToRGB(this.props.color,0.95), "move")
		// q.offset = this.props.thickness*0.4
		// this.updateCanvas(q, "self")


		// var r = new Point(posX, posY+this.props.thickness*0.8, this.props.thickness, this.hexToRGB(this.props.color,0.4), "move")
		// this.updateCanvas(r, "self")


		// Create stroke move object
		this.setState(prevState => ({
			...prevState,
			strokes: this.state.strokes.concat(p)
		}))
		// sendStroke(this.props.socket, {x: posX/this.width, y: posY/this.height}, this.props.color, this.props.thickness)

	}

	onDrawStart = (event) => {
		// Disable drawing on this canvas if brush type not selected
		if (this.props.brushType !== brushTypes.USER) {
			return;
		}
		// console.log("Got start event:", event)
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		// Create stroke move object
		var p = new Point(posX, posY, this.props.thickness, this.props.color, "start")
		this.updateCanvas(p, "self")

		this.setState(prevState => ({
			...prevState,
			strokes: this.state.strokes.concat(p)
		}))
		// socket: start stroke
		// sendStrokeStart(this.props.socket, {x: p.x, y: p.y}, p.thickness, p.color);

	}

	onDrawEnd = (event) => {
		// Disable drawing on this canvas if brush type not selected
		if (this.props.brushType !== brushTypes.USER) {
			return;
		}
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		// Create stroke move object
		var p = new Point(posX, posY, this.props.thickness, this.props.color, "end")
		this.updateCanvas(p, "self")

		this.setState(prevState => ({
			...prevState,
			strokes: this.state.strokes.concat(p)
		}))
		// socket: end stroke
		// sendStrokeEnd(this.props.socket, this.props.color, this.props.thickness);
	}

	clearCanvas = () => {
		var canvas = this.canvasRef.current
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	updateCanvas = (point, client) => {
		// client: "self" | "other"
		// point: Point

		// draw a point
		console.log("canvas ref in update is", client)
		if (!this.canvasRef) {
			return;
		}

		var offset = point.offset || 0;

		var strokes;
		var lastPoint;
		// Error checking
		if (client == "self") {
			if (!this.state.strokes || this.state.strokes.length < 1) {
				return;
			}
			else {
				strokes = this.state.strokes
				lastPoint = strokes[strokes.length - 1]
			}
		} else {
			if (!this.props.otherStrokes || this.props.otherStrokes.length < 3) {
				return;
			} else {
				strokes = this.props.otherStrokes
				lastPoint = strokes[strokes.length - 2]
			}
		}




		var canvas = this.canvasRef.current
		var len = strokes.length
		// console.log("canvas is", canvas == null)

		if (canvas && len > 0) {
			var { x, y, type, thickness } = point
			// console.log("lastpoint is", lastPoint, "point is",)
			var ctx = canvas.getContext("2d");
			ctx.lineWidth = thickness

			switch (type) {
				case "start":
					ctx.moveTo(x - offset, y - offset)
					ctx.beginPath();
					ctx.lineTo(x - offset, y - offset);

					break;
				case "end":
					break;
				case "move":
					ctx.beginPath();

					ctx.moveTo(lastPoint.x - offset, lastPoint.y - offset)

					ctx.lineTo(x - offset, y - offset);
					break;

			}

			if (this.props.userBrushType == userBrushes.PAINT) {
				ctx.fillStyle = this.props.color;
				ctx.strokeStyle = point.color;
				ctx.lineJoin = 'miter';
				ctx.lineCap = "butt";
				console.log("IANTNT", ctx.lineJoin, ctx.lineCap)

				ctx.closePath()
				ctx.stroke();
			}

			else if (this.props.userBrushType == userBrushes.PENCIL) {
				ctx.fillStyle = this.props.color;
				ctx.strokeStyle = point.color;
				ctx.lineJoin = ctx.lineCap = 'round';
				ctx.closePath()
				ctx.stroke();
			}



			// SPLOTCH BRUSH
			else if (this.props.userBrushType == userBrushes.SPLOTCH) {
				if (Math.random() < 0.99) {
					// ctx.stroke();			
					ctx.beginPath()
					ctx.arc(x - offset, y - offset, Math.random() * thickness/2, false, Math.PI * 2, false);
					ctx.fillStyle = this.hexToRGB(this.props.color, Math.random());

					ctx.fill();

				}
			}

			else if (this.props.userBrushType === userBrushes.IMAGE_BRUSH ||
				this.props.userBrushType === userBrushes.IMAGE_CHARCOAL
				) {
				// IMAGE BRUSH
				ctx.globalAlpha = 0.5
				var c = React.createElement(Canvas)

				const image = new Image(canvas);
				image.src = this.state.imageBrush
				console.log('image is loaded');

				ctx.save();

				ctx.translate((x - offset - thickness / 2)+thickness/2, (y - offset - thickness / 2)+thickness/2);
				var angle = Math.atan2(y-lastPoint.y, x-lastPoint.x) * 180 / Math.PI;
				ctx.rotate(angle*Math.PI/180.0);
				ctx.translate(-(x - offset - thickness / 2)-thickness/2, -(y - offset - thickness / 2)-thickness/2);
				ctx.drawImage(image, x - offset - thickness / 2, y - offset - thickness / 2, thickness, thickness);
				ctx.restore();

				ctx.globalAlpha = 1

			}





		}

	}

	handleCanvas = (canvas) => {
		if (canvas === null) {
			return 
		}
		// console.log("handling canvas", canvas)

		const ctx = canvas.getContext('2d');
		canvas.width = this.props.width;
		canvas.height = this.props.height;



		this.canvasRef = canvas;
		this.canvasRef.current = canvas;



	}


	getPathData = (x, y, width, color) => {
		return {
			drawer: null,
			size: {
				width: this.canvas._size.width,
				height: this.canvas._size.height,
			},
			path: {
				data: [`${x.toString()},${y.toString()}`],
				// eslint-disable-next-line radix
				width: width,
				color: color,
				id: parseInt(Math.random() * 100000000),
			},
		};
	};

	getPathDataArray = (data, width, color) => {
		parsedArr = [];
		for (var i = 0; i < data.length; i++) {
			parsedArr.push(`${data[i].x},${data[i].y}`);
		}
		return {
			drawer: null,
			size: {
				width: this.canvas._size.width,
				height: this.canvas._size.height,
			},
			path: {
				data: parsedArr,
				// eslint-disable-next-line radix
				width: width,
				color: color,
				id: parseInt(Math.random() * 100000000),
			},
		};
	};

	getBase64 = async () => {
		var canvas = this.canvasRef.current
		// console.log("Getting base64 is", canvas.toDataURL());

		// toDataURL is a string on web, and a promise on android/ios
		var ret = canvas.toDataURL()

		// web
		if (typeof (ret) == "string") {
			return Promise.resolve(ret)
			// android/ios
		} else {
			return ret;
		}
	}


	// FOR COLLABORATIVE DRAWING 
	// DISABLED FOR NOW

	// Send stroke point data
	onStrokeChangeHandler = (x, y) => {
		// sendStroke(this.props.socket, { x: x, y: y }, this.props.color, this.props.thickness);
	};

	// Send stroke end signal
	onStrokeEndHandler = () => {
		// sendStrokeEnd(this.props.socket, this.props.color, this.props.thickness);
	};
	onStrokeStartHandler = (x, y) => {
		// sendStrokeStart(this.props.socket);
	};

	render() {
		if (Platform.OS === "web") {
			return (
				<View
					style={[styles.drawBoxInner, { opacity: this.props.opacity }]}
					onStartShouldSetResponder={(event) => { return true; }}
					onMoveShouldSetResponder={(event) => { return true; }}
					onResponderStart={this.onDrawStart}
					onResponderMove={this.onDrawMove}
					onResponderRelease={this.onDrawEnd}
				>
					<canvas ref={this.handleCanvas} />
				</View>
			)
		} else {
			return (
				<View
					onStartShouldSetResponder={(event) => { return true; }}
					onMoveShouldSetResponder={(event) => { return true; }}
					onResponderStart={this.onDrawStart}
					onResponderMove={this.onDrawMove}
					onResponderRelease={this.onDrawEnd}
					style={styles.drawBox}
				>
					<Canvas width={styles.drawBox.width}
						height={styles.drawBox.height}
						ref={this.handleCanvas}
					/>
				</View>
			)
		}
	}
}


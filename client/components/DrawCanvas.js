import React, { Component, useRef } from 'react';
import {Text, View, Platform, StyleSheet, Dimensions} from 'react-native';
import Canvas, {Image as CanvasImage} from 'react-native-canvas';
import { generateStyle } from '../styles/styles';
import Point from "../classes/Point";
import {
	sendStroke,
	sendStrokeEnd,
	sendStrokeStart,
  } from '../api/websocketApi.js';
import brushTypes from "../constants/brushTypes.js"
  
var device = Dimensions.get('window');


const styles = StyleSheet.create(generateStyle(device));



export default class DrawCanvas extends Component {


	state = {
		strokes: []
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
		this.clearCanvas = this.clearCanvas.bind(this);

	}

	componentDidUpdate(prevProps) {
		if (prevProps.otherStrokes != this.props.otherStrokes) {
		//   console.log("collaborator", prevProps.otherStrokes, "new:", this.props.otherStrokes)
			if (this.props.otherStrokes.length > 0) {
				var newStroke = this.props.otherStrokes[this.props.otherStrokes.length-1]
				this.updateCanvas(newStroke, "other")		
			}
		}
	}	  
	
    onDrawMove = (event) => {
		if (this.props.brushType !== brushTypes.AI) {
			return
		}
		// console.log(event.nativeEvent)
        // console.log("hello");
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		var p = new Point(posX, posY, this.props.thickness, this.props.color, "move")
		this.updateCanvas(p, "self")

		// Create stroke move object
		this.setState({
			strokes: this.state.strokes.concat(p)
		})
		sendStroke(this.props.socket, {x: posX/this.width, y: posY/this.height}, this.props.color, this.props.thickness)
		
    }

	onDrawStart = (event) => {
		if (this.props.brushType !== brushTypes.AI) {
			return
		}
		// console.log("Got start event:", event)
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		// Create stroke move object
		var p = new Point(posX, posY, this.props.thickness, this.props.color, "start")
		this.updateCanvas(p, "self")

		this.setState({
			strokes: this.state.strokes.concat(p)
		} )
		// socket: start stroke
		sendStrokeStart(this.props.socket, {x: p.x, y: p.y}, p.thickness, p.color);

	}

	onDrawEnd = (event) => {
		if (this.props.brushType !== brushTypes.AI) {
			return
		}
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		// Create stroke move object
		var p = new Point(posX, posY, this.props.thickness, this.props.color,  "end")
		this.updateCanvas(p, "self")

		this.setState({
			strokes: this.state.strokes.concat(p)
		})
		// socket: end stroke
		sendStrokeEnd(this.props.socket, this.props.color, this.props.thickness);
	}

	updateCanvas = (point, client) => {
		// client: "self" | "other"
		// point: Point

		// draw a point
		if (!this.canvasRef) {
			return;
		}

		var strokes;
		var lastPoint;
		// Error checking
		if (client == "self")
		{
			if (!this.state.strokes || this.state.strokes.length < 1)
			{
				return;
			}
			else {
				strokes = this.state.strokes
				lastPoint = strokes[strokes.length-1]	
			}
		} else
		{
			if (!this.props.otherStrokes || this.props.otherStrokes.length < 3)
			{
				return;
			} else {
				strokes = this.props.otherStrokes
				lastPoint = strokes[strokes.length-2]	
			}
		}
		



		var canvas = this.canvasRef.current
		var len = strokes.length
		// console.log("canvas is", canvas == null)

		if (canvas && len > 0) {
			var {x, y, type, thickness} = point
			// console.log("lastpoint is", lastPoint, "point is",)
			var ctx = canvas.getContext("2d");
			ctx.lineWidth = thickness

			switch (type) {
				case "start":
					ctx.moveTo(x, y)
					ctx.beginPath();
					ctx.lineTo(x, y);

					break;
				case "end":
					break;
				case "move":
					ctx.beginPath();

					ctx.moveTo(lastPoint.x, lastPoint.y)

					ctx.globalCompositeOperation = 'source-over';
					ctx.lineTo(x, y);
					break;

			}
			ctx.fillStyle = point.color;
			ctx.strokeStyle = point.color;
			ctx.lineJoin = ctx.lineCap = 'round';
			ctx.closePath()
			ctx.stroke();			

		}

	}

	componentDidMount() {
		this.props.setClickClear(this.clearCanvas);
	 }
	 clearCanvas = () => {
		var canvas = this.canvasRef.current
		var ctx = canvas.getContext("2d");

		// Fill upper half of the canvas with sky
		ctx.fillStyle = "#759edf";
		ctx.fillRect(0, 0, canvas.width, 3*canvas.height/4);
		
		// Fill bottom half of canvas with sea
		ctx.fillStyle = "#384f83";
		ctx.fillRect(0, 3*canvas.height/4, canvas.width, canvas.height/4);
	}



	handleCanvas = (canvas) => {
		// console.log("handling canvas", canvas)
		if (canvas === null) {
			return 
		}

		const ctx = canvas.getContext('2d');
		canvas.width = this.props.width;
		canvas.height = this.props.height;

		this.canvasRef = canvas;
		this.canvasRef.current = canvas;

		this.clearCanvas();



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
		console.log("Getting base64 is", canvas.toDataURL());

		// toDataURL is a string on web, and a promise on android/ios
		var ret = canvas.toDataURL() 

		// web
		if (typeof(ret) == "string") {
			return Promise.resolve(ret)
		// android/ios
		} else {
			return ret;
		}
	}

	// Send stroke point data
	onStrokeChangeHandler = (x, y) => {
		sendStroke(this.props.socket, {x: x, y: y}, this.props.color, this.props.thickness);
	};

	// Send stroke end signal
	onStrokeEndHandler = () => {
		sendStrokeEnd(this.props.socket, this.props.color, this.props.thickness);
	};
	onStrokeStartHandler = (x, y) => {
		sendStrokeStart(this.props.socket);
	};
   
    render() {
      if (Platform.OS === "web") {
		return (
		<View
			style= {[styles.drawBoxInner, {opacity: this.props.opacity}]}
			onStartShouldSetResponder={(event) => {return true;}}
			onMoveShouldSetResponder={(event) => {return true;}}
			onResponderStart={this.onDrawStart}
			onResponderMove={this.onDrawMove}
			onResponderRelease={this.onDrawEnd}
		>
        <canvas 
		draggable={false}

		ref={this.handleCanvas}/>
		</View>
		)
	} else {
		return (
			<View
			onStartShouldSetResponder={(event) => {return true;}}
			onMoveShouldSetResponder={(event) => {return true;}}
			onResponderStart={this.onDrawStart}
			onResponderMove={this.onDrawMove}
			onResponderRelease={this.onDrawEnd}
			style= {styles.drawBox}
			>
			<Canvas 
			draggable={false}
			
			width={styles.drawBox.width}
					height={styles.drawBox.height} 
					ref={this.handleCanvas} 
			/>
			</View>
		)
	}
    }
  }


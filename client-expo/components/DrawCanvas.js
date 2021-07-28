import React, { Component, useRef } from 'react';
import {Text, View, Platform, StyleSheet, Dimensions} from 'react-native';
import Canvas, {Image as CanvasImage} from 'react-native-canvas';
import { generateStyle } from '../styles/styles';
import Point from "../classes/Point";

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

	  }
	
    onDrawMove = (event) => {
		// console.log(event.nativeEvent)
        // console.log("hello");
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		var p = new Point(posX, posY, this.props.thickness, "move")
		this.updateCanvas(p)

		// Create stroke move object
		this.setState({
			strokes: this.state.strokes.concat(p)
		})

		
    }

	onDrawStart = (event) => {
		// console.log("Got start event:", event)
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		// Create stroke move object
		var p = new Point(posX, posY, this.props.thickness, "start")
		this.updateCanvas(p)

		this.setState({
			strokes: this.state.strokes.concat(p)
		} )

	}

	onDrawEnd = (event) => {
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		// Create stroke move object
		var p = new Point(posX, posY, this.props.thickness, "end")
		this.updateCanvas(p)

		this.setState({
			strokes: this.state.strokes.concat(p)
		} )
	}

	updateCanvas = (point) => {
	// draw a point
		// console.log("canvas ref in update is", this.canvasRef)
		if (!this.canvasRef) {
			return;
		}
		var canvas = this.canvasRef.current
		var len = this.state.strokes.length
		// console.log("canvas is", canvas == null)

		if (canvas && len > 0) {
			var lastPoint = this.state.strokes[len-1]
			var secondLastPoint = this.state.strokes[len-2]
			var {x, y, type, thickness} = point
			// console.log("thickness is", x, y, type, thickness)
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
			ctx.fillStyle = this.props.color;
			ctx.strokeStyle = this.props.color;
			ctx.lineJoin = ctx.lineCap = 'round';
			ctx.closePath()
			ctx.stroke();			

		}

	}

	handleCanvas = (canvas) => {
		// console.log("handling canvas", canvas)

		const ctx = canvas.getContext('2d');
		canvas.width = Math.min(device.width * 0.75, device.height * 0.75);
		canvas.height = Math.min(device.width * 0.75, device.height * 0.75);

		this.canvasRef = canvas;
		this.canvasRef.current = canvas;

	}
   
    render() {
      if (Platform.OS === "web") {
		return (
		<View
		style= {styles.drawBox}
		onStartShouldSetResponder={(event) => {return true;}}
		onMoveShouldSetResponder={(event) => {return true;}}
		onResponderStart={this.onDrawStart}
		onResponderMove={this.onDrawMove}
		onResponderRelease={this.onDrawEnd}

		>
	

        <canvas style={{"borderColor":"black"}} ref={this.handleCanvas}  />
		</View>
		)
	} else {
		return (
			<View
			// onTouchMove={this.onDrawMove}
			// onTouchStart={this.onDrawStart}
			// onTouchEnd={this.onDrawEnd}
			// onMouseDown={this.onDrawStart}
			onStartShouldSetResponder={(event) => {return true;}}
			onMoveShouldSetResponder={(event) => {return true;}}
			style= {styles.drawBox}

			onResponderStart={this.onDrawStart}
			onResponderMove={this.onDrawMove}
			onResponderRelease={this.onDrawEnd}
	
			>
			<Canvas width={styles.drawBox.width} height={styles.drawBox.height} ref={this.handleCanvas} />
			</View>
		)
	
	}
    
    }
   
    
  }


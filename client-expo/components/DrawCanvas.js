import React, { Component } from 'react';
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
		this.canvasRef = React.createRef();
		this.thickness = props.thickness
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

		const canvas = this.canvasRef.current
		// console.log("canvas is none")
		var len = this.state.strokes.length

		if (canvas && len > 0) {
			var lastPoint = this.state.strokes[len-1]
			var secondLastPoint = this.state.strokes[len-2]
			var {x, y, type, thickness} = point
			console.log("thickness is", thickness)
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

			ctx.fillStyle = 'black';
			ctx.strokeStyle = 'black';
			ctx.lineJoin = ctx.lineCap = 'round';
			ctx.closePath()
			ctx.stroke();			

		}

	}
   
    render() {
      if (Platform.OS === "web") {
		<View
		style= {styles.drawBox}
		onTouchMove={this.onDrawMove}>
        <canvas style={{ "width":800, "height":1500 }} ref={(ref) => {console.log("setting ref"); this.canvasRef = ref}} />
		</View>
	}
    
    return (
		<View
		onTouchMove={this.onDrawMove}
		onTouchStart={this.onDrawStart}
		style= {styles.drawBox}
		>
        <Canvas style={{ "width":800, "height":1500 }} ref={this.canvasRef} />
		</View>
    )
    }
   
    
  }


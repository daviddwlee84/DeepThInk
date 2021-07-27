import React, { Component } from 'react';
import {Text, View, Platform, StyleSheet, Dimensions} from 'react-native';
import Canvas, {Image as CanvasImage} from 'react-native-canvas';
import { generateStyle } from '../styles/styles';

var device = Dimensions.get('window');

var width = 800;
var height = 800;

const styles = StyleSheet.create(generateStyle(device));

export default class DrawCanvas extends Component {

	state = {
		strokes: []
	}
	constructor(props) {
		super(props);
		this.canvasRef = React.createRef();
	  }
	
    onDraw = (event) => {
		// console.log(event.nativeEvent)
        // console.log("hello");
		var posX = event.nativeEvent.locationX
		var posY = event.nativeEvent.locationY

		this.setState({
			strokes: this.state.strokes.concat({"x": posX, "y": posY})
		})
		this.updateCanvas()
    }

	updateCanvas = () => {

		const canvas = this.canvasRef.current
		// console.log("canvas is none")
		if (canvas) {
			// console.log("printing")
			var ctx = canvas.getContext("2d");
			ctx.beginPath();
			ctx.moveTo(0,0)	
			ctx.fillStyle = 'red';
			ctx.strokeStyle = 'red';

			for (let obj of this.state.strokes) {
				ctx.lineTo(obj.x, obj.y);
			}
			ctx.stroke();			

		}

	}
   
    render() {
      if (Platform.OS === "web") {
		<View
		style= {styles.drawBox}
		onTouchMove={this.onDraw}>
        <canvas style={{ width, height }} ref={(ref) => {console.log("setting ref"); this.canvasRef = ref}} />
		</View>    
	}
    
    return (
		<View
		onTouchMove={this.onDraw}
		style= {styles.drawBox}
		>
        <Canvas style={{ width, height }} ref={this.canvasRef} />
		</View>
    )
    }
   
    
  }


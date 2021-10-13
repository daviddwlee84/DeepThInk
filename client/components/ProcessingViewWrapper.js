import { ProcessingView } from 'expo-processing';
import React, { Component } from 'react';
import {View} from 'react-native';

export default class ProcessingViewWrapper extends Component {
  //------------------------------------------------------
  _sketch = p => {
    var img;
    p.setup = () => {
      p.size(480, 120);
      p.strokeWeight(7);
      img = p.loadImage("../resources/brush.png");
      
    };

    p.draw = () => {
      p.image(img, 100, 50);
      // console.log('img is', img)
      if (p.mousePressed) {
        console.log("mouse is", p.mouseX, p.mouseY)

        p.fill(0);
      } else {
        p.fill(255);
      }
      // p.ellipse(p.mouseX, p.mouseY, 80, 80);
    };
  };
  //------------------------------------------------------


  render() {
    return (
      <View
      style={{ flex: 1 }}
      // onStartShouldSetResponder={(event) => {return true;}}
      // onMoveShouldSetResponder={(event) => {return true;}}
      // onResponderStart={this.onDrawStart}
      // onResponderMove={this.onDrawMove}
      // onResponderRelease={this.onDrawEnd}
      
      >
            <ProcessingView style={{ flex: 1 }} sketch={this._sketch} />

      </View>

    )
  }
    
  


}

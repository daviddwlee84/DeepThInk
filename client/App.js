import React, { Component } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Button,
  Dimensions,
  Image,
  TouchableOpacity,
  Text,
  TextInput,
  ImageBackground,
} from "react-native";
import DrawCanvas from "./components/DrawCanvas";
import UserCanvas from "./components/UserCanvas";
import InspireMode from "./components/InspireMode";

import Slider from "@react-native-community/slider";
import colorMap from "./constants/colorMap.js";
import brushTypes from "./constants/brushTypes.js";
import userBrushes from "./constants/userBrushes.js";
import styleTransferOptions from "./constants/styleTransferOptions.js";
import userBrushesOptions from "./constants/userBrushesOptions.js";
import filterOptions from "./constants/filterBrushOptions.js";

import messageKinds from "./constants/messageKinds.js";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { RgbaColorPicker } from "react-colorful";
import { SearchBar } from 'react-native-elements';

var device = Dimensions.get("window");
const CANVASWIDTH = device.height * 0.8;
const CANVASHEIGHT = device.height * 0.8;

const LOCALURL = "http://127.0.0.1:8000";
// const LOCALURL = "http://region-11.autodl.com:25172"
// const LOCALURL = ""

// Connect to Go backend
// for web
// for android
// let this.state.socket = new WebSocket('ws://10.0.2.2:8080/ws');

// Create dynamic style based on device width/height
// const styles = StyleSheet.create(generateStyle(device));

export default class App extends Component {
  // React state: store the image data
  state = {
    showAICanvas: true,
    showInspireMode: false,
    showUserCanvas: false,

    rightColumnWidth: device.height * 0.11 * 1.8,
    rightColumnMargin: device.height * 0.007,

    leftColumnWidth: device.height * 0.25,
    leftColumnLeftMargin: device.height * 0.007,
    //device.width - (device.height * (0.85 * 1.25 + 0.11 * 1.8 + 0.25 + 0.007 + 0.3))

    //canvas + small canvas, right col, left col, marginleft of left col
    AI_CANVASWIDTH: Math.min(
      (device.width - device.height * (0.11 * 1.8 + 0.25 + 0.007 + 0.15)) * 0.65,
      device.height * 0.65
    ),
    // device.height * (0.85 * 1.25 + 0.11 * 1.8 + 0.25 + 0.007) > device.width
    //   ? device.height * 0.5
    //   : device.height * 0.85,
    AI_CANVASHEIGHT: Math.min(
      (device.width - device.height * (0.11 * 1.8 + 0.25 + 0.007 + 0.15)) * 0.65,
      device.height * 0.65
    ),
    //AI_CANVASWIDTH: device.height * 0.85,
    //AI_CANVASHEIGHT: device.height * 0.85,

    //USER_CANVASWIDTH: device.height * 0.85,
    //USER_CANVASHEIGHT: device.height * 0.85,
    USER_CANVASWIDTH: Math.min(
      (device.width - device.height * (0.11 * 1.8 + 0.25 + 0.007 + 0.15)) * 0.65,
      device.height * 0.65
    ),
    USER_CANVASHEIGHT: Math.min(
      (device.width - device.height * (0.11 * 1.8 + 0.25 + 0.007 + 0.15)) * 0.65,
      device.height * 0.65
    ),
    aiCanvasImageData: "data:image/png;base64,", // image data of the ai canvas

    imageData: "data:image/png;base64,", // raw image data of the segmentation image
    generatedImageData: "data:image/png;base64,", // raw image data of the generated image
    stylizedImageData: "data:image/png;base64,", // raw image data of stylized generated image
    displayedImageData: "data:image/png;base64,", // raw image data of displayed image
    finalImageData: "data:image/png;base64,", // raw image data of generatedImageData + userCanvasImageData
    style: "none", // selected style
    color: "#384f83", // pen color
    imageFilter: "",
    userBrushColor: "#00FF00",
    colorPickerDisplay: { r: 0, g: 255, b: 0, a: 1 }, // another color state to keep track of the current color picker state
    searchValue: "", // text input by user for searching desired brush color
    filteredData: colorMap.colors, // result of filtering colorMap with searchValue

    userBrushBase64: "data:image/png;base64,", // user brush
    userBrushType: userBrushes.PENCIL,
    styleBrushType: "None",
    filterBrushType: "None",
    thickness: 10, // stroke thickness
    ownStroke: [], // client stroke data
    collaboratorStroke: [], // collaborator data
    opacity: 1, // Toggle between the drawing canvas and generated image.
    displayColorPicker: false,
    disableDrawing: false, // used when eyedropper is active
    disableButtons: false, // used when the eyedropper is active
    // 1 = show drawing canvas, 0 = show image
    // socket: new WebSocket('ws://localhost:8080/ws')
    // socket:
    //   Platform.OS === "web"
    //     ? new WebSocket(`ws://${backendConstants.BACKEND_URL}:8080/ws`)
    //     : new WebSocket(`ws://${backendConstants.BACKEND_URL}:8080/ws`),
    canvasWidth: CANVASWIDTH,
    canvasHeight: CANVASHEIGHT,
    currentBrush: brushTypes.AI,

    showPreview: true, // show the preview of the other canvas at the top left corner

    isLoading: true, //for loading spinner
    isChangeSize: false, //for slider

    isFirstLoadDrawCanvas: true, // show a default segmentation map for the first time in the AI canvas
    text: '',
    flag: 1
  };

  constructor(props) {
    super(props);
    this.sendRequestHelper = this.sendRequestHelper.bind(this);
    this.arrayholder = colorMap.colors;
  }

  // Run when component is first rendered
  componentDidMount() {
    console.log("Attempting connection");

    this.setState((prevState) => ({
      ...prevState,
      isLoading: false,
      isFirstLoadDrawCanvas: false,
    }));
  }
  // get image data from canvas
  // Then call sendRequest to send the data to backend
  grabPixelsGan = async () => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
      flag: 1
    }));
    var getImage = this.refs.drawCanvasRef.getBase64().then((value) => {
      var resultImage = value.split(";base64,")[1];
      console.log("result image is", resultImage);
      this.setState(
        (prevState) => ({
          ...prevState,
          imageData: resultImage,
        }),
        // Do callback to send to server after the imageData is set
        this.sendRequestHelper
      );
    });
  };

  grabPixelsSd = async () => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
      flag: 2
    }));
    var getImage = this.refs.drawCanvasRef.getBase64().then((value) => {
      var resultImage = value.split(";base64,")[1];
      console.log("result image is", resultImage);
      this.setState(
        (prevState) => ({
          ...prevState,
          imageData: resultImage,
        }),
        // Do callback to send to server after the imageData is set
        this.sendRequestHelper
      );
    });
  };

  grabPixelsCN = async () => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
      flag: 3
    }));
    var getImage = this.refs.drawCanvasRef.getBase64().then((value) => {
      var resultImage = value.split(";base64,")[1];
      console.log("result image is", resultImage);
      this.setState(
        (prevState) => ({
          ...prevState,
          imageData: resultImage,
        }),
        // Do callback to send to server after the imageData is set
        this.sendRequestHelper
      );
    });
  };

  // Send request to model server to generate painting
  sendRequestHelper = async () => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
    }));

    const response = await fetch(`${LOCALURL}/generate`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Token f40e401a60e03f6ae459a36e1faa4e5c575819f5'
      },
      body: JSON.stringify({
        imageData: this.state.imageData,
        prompt: this.state.text,
        flag: this.state.flag
      }),
    });

    const msg = await response.json()
    console.log(msg)
    this.setState((prevState) => ({
      ...prevState,
      generatedImageData: msg.data,
      displayedImageData: msg.data,
    }));

    this.setState((prevState) => ({
      ...prevState,
      isLoading: false,
    }));

  };
  // Send a request to the model server to stylize the generated painting
  sendRequestStyleHelper = async (newStyle) => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
    }));

    const response = await fetch(`${LOCALURL}/stylize`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageData: this.state.generatedImageData,
        style: newStyle,
      }),
    });

    const msg = await response.json();
    console.log(msg)
    this.setState((prevState) => ({
      ...prevState,
      styleBrushType: newStyle,
      stylizedImageData: msg.data,
      displayedImageData: msg.data,
    }));

    this.setState((prevState) => ({
      ...prevState,
      isLoading: false,
    }));

  };
  // xxxxx
  saveGeneratedImage = () => {
    if (this.refs.userCanvasRef == null) {
      alert(
        "Unable to save the painting in AI Brush. Please select 'User Brush' or 'Style' or 'Filter' and try again."
      );
      return;
    } else {
      var getImage = this.refs.userCanvasRef.getBase64().then((value) => {
        var resultImage = value.split(";base64,")[1];
        var foregroundImageDataStripped =
          this.state.displayedImageData.split(";base64,")[1];
        this.setState((prevState) => ({
          ...prevState,
          isLoading: true,
        }));
        this.state.socket.send(
          JSON.stringify({
            kind: messageKinds.MESSAGE_SAVE,
            data: {
              displayedImageData: foregroundImageDataStripped,
              userCanvasImageData: resultImage,
              aiCanvasImageData: this.state.imageData,
            },
          })
        );
      });
    }
  };

  handleThickness = (sliderValue) => {
    this.setState((prevState) => ({
      ...prevState,
      thickness: sliderValue,
      isChangeSize: true,
    }));
    console.log("thickness is now", sliderValue);
  };

  handleThicknessEnd = (sliderValue) => {
    this.setState((prevState) => ({
      ...prevState,
      isChangeSize: false,
    }));
    console.log("thickness is done chaging", sliderValue);
  };

  handleOpacity = (sliderValue) => {
    this.setState((prevState) => ({
      ...prevState,
      opacity: sliderValue,
    }));
    console.log("opacity is now", sliderValue);
  };

  // Convert object of rgb {r: g: b:} to hex string
  rgbToHex = (d) => {
    const red = d.r;
    const green = d.g;
    const blue = d.b;
    const rgb = (red << 16) | (green << 8) | (blue << 0);
    return "#" + (0x1000000 + rgb).toString(16).slice(1);
  };
  hex2rgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // return {r, g, b} // return an object
    return { r: r, g: g, b: b, a: 1 };
  };

  // Enable the AI canvas for drawing
  // Display the
  enableAICanvas = () => {
    if (this.state.showAICanvas) {
      return;
    }

    // Save the drawcanvas and usercanvas data
    var getImageUserCanvas = this.refs.userCanvasRef
      .getBase64()
      .then((usercanvas) => {
        this.setState(
          (prevState) => ({
            ...prevState,
            showAICanvas: true,
            showInspireMode: false,
            showUserCanvas: false,
            userCanvasImageData: usercanvas,
          }),
          () => {
            for (var i = 0; i < 2; i++) {
              setTimeout(() => {
                this.refs.drawCanvasRef.loadData(this.state.aiCanvasImageData);
              }, 0);
            }
            this.refs.drawCanvasRef.loadData(this.state.aiCanvasImageData);
          }
        );

        // Load the data base64
      });
  };

  enableUserCanvas = () => {
    if (this.state.showUserCanvas) {
      return;
    }

    // Save the drawcanvas and usercanvas data
    var getImageAICanvas = this.refs.drawCanvasRef
      .getBase64()
      .then((aicanvas) => {
        this.setState(
          (prevState) => ({
            ...prevState,
            showAICanvas: false,
            showInspireMode: false,
            showUserCanvas: true,
            aiCanvasImageData: aicanvas,
          }),
          () => {
            for (var i = 0; i < 2; i++) {
              setTimeout(() => {
                this.refs.userCanvasRef.loadData(
                  this.state.userCanvasImageData
                );
              }, 0);
            }
          }
        );
        // Load the data base64
      });
  };

  switchToAICanvas = () => {
    this.setState((prevState) => ({
      ...prevState,
      currentBrush: brushTypes.AI,
    }));
    this.enableAICanvas();
  }

  switchToInspireMode = () => {
    this.setState((prevState) => ({
      ...prevState,
      showInspireMode: true,
      currentBrush: brushTypes.INSPIRE,
    }));
    // this.enableInspireMode();
  }

  switchToStyleBrush = () => {
    this.setState((prevState) => ({
      ...prevState,
      currentBrush: brushTypes.STYLE,
    }));
    this.enableUserCanvas();
  }

  switchToFilterBrush = () => {
    this.setState((prevState) => ({
      ...prevState,
      currentBrush: brushTypes.FILTER,
    }));
    this.enableUserCanvas();

  }

  switchToUserBrush = () => {
    this.setState((prevState) => ({
      ...prevState,
      currentBrush: brushTypes.USER,
    }));
    // Display user canvas
    this.enableUserCanvas();
  }

  searchBrushColor = (texte) => {
    const filterResult = this.arrayholder.filter((item) => {
      const item_label = item.label.toUpperCase();
      const text_input = texte.toUpperCase();
      return item_label.indexOf(text_input) > -1;
    });
    this.setState({ filteredData: filterResult});
    this.setState({ searchValue: texte });
  };

  render() {
    let brushSlider = (
      <View
        style={{
          backgroundColor: "#f2f2eb",
          width: this.state.leftColumnWidth,
          marginLeft: this.state.leftColumnLeftMargin,
          borderRadius: 10,
          flexDirection: "column",
          padding: 5,
        }}
      >
        <View>
          <Text
            style={{
              textAlign: "center",
              color: "#363636",
              fontWeight: "bold",
              fontSize: 16,
              padding: 2,
            }}
          >
            Size
          </Text>
        </View>

        <Slider
          style={{
            width: device.height * 0.22,
            margin: "auto",
            height: device.height * 0.03,
          }}
          value={this.state.thickness}
          minimumValue={1}
          maximumValue={CANVASWIDTH / 4}
          thumbTintColor="#4f4f4f"
          minimumTrackTintColor="#707070"
          maximumTrackTintColor="#cfcfcf"
          onValueChange={this.handleThickness}
          onSlidingComplete={this.handleThicknessEnd}
        />
      </View>
    );

    // For ipad sizing
    // prevent bouncing / scroll on ios
    document.documentElement.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.overflow = "auto";

    return (
      <View style={styles.container}>
        {/* this View wraps the left column */}
        <View
          style={{
            width: this.state.leftColumnLeftMargin + this.state.leftColumnWidth - 40,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              this.switchToAICanvas();
            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.AI
                      ? device.height * 0.10
                      : device.height * 0.08,
                  width:
                    this.state.currentBrush == brushTypes.AI
                      ? device.height * 0.10 * 1.5
                      : device.height * 0.08 * 1.5,
                  opacity: this.state.currentBrush == brushTypes.AI ? 1 : 0.55,
                },
              ]}
              source={require("./resources/AIBrush.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              this.switchToInspireMode();
            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.INSPIRE
                      ? device.height * 0.10
                      : device.height * 0.08,
                  width:
                    this.state.currentBrush == brushTypes.INSPIRE
                      ? device.height * 0.10 * 1.5
                      : device.height * 0.08 * 1.5,
                  opacity: this.state.currentBrush == brushTypes.INSPIRE ? 1 : 0.55,
                },
              ]}
              source={require("./resources/AIBrush.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              this.switchToStyleBrush();
            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.STYLE
                      ? device.height * 0.10
                      : device.height * 0.08,
                  width:
                    this.state.currentBrush == brushTypes.STYLE
                      ? device.height * 0.10 * 1.5
                      : device.height * 0.08 * 1.5,
                  opacity:
                    this.state.currentBrush == brushTypes.STYLE ? 1 : 0.55,
                },
              ]}
              source={require("./resources/styleBrush.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              this.switchToFilterBrush();
            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.FILTER
                      ? device.height * 0.10
                      : device.height * 0.08,
                  width:
                    this.state.currentBrush == brushTypes.FILTER
                      ? device.height * 0.10 * 1.5
                      : device.height * 0.08 * 1.5,
                  opacity:
                    this.state.currentBrush == brushTypes.FILTER ? 1 : 0.55,
                },
              ]}
              source={require("./resources/filterBrush.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              this.switchToUserBrush();
            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.USER
                      ? device.height * 0.10
                      : device.height * 0.08,
                  width:
                    this.state.currentBrush == brushTypes.USER
                      ? device.height * 0.10 * 1.5
                      : device.height * 0.08 * 1.5,
                  opacity:
                    this.state.currentBrush == brushTypes.USER ? 1 : 0.55,
                },
              ]}
              source={require("./resources/userBrush.png")}
            />
          </TouchableOpacity>

          {this.state.currentBrush == brushTypes.AI && (
            <View>{brushSlider}</View>
          )}
          {this.state.currentBrush == brushTypes.USER && (
            <View>
              <RgbaColorPicker
                style={{
                  marginLeft: this.state.leftColumnLeftMargin,
                  marginBottom: 3,
                  width: this.state.leftColumnWidth,
                  height: this.state.leftColumnWidth,
                }}
                color={this.state.colorPickerDisplay}
                onChange={(color) => {

                  this.setState((prevState) => ({
                    ...prevState,
                    userBrushColor: this.rgbToHex(color),
                    opacity: color.a,
                    colorPickerDisplay: color,
                  }));
                  // sendSwitchUserBrush(this.state.socket,this.state.userBrushType,this.rgbToHex(color))

                }}
              />
              {brushSlider}
            </View>
          )}
          {/* Save painting button */}
          {/* <View
            style={{ padding: "1em", marginTop: "10px", marginBottom: "10px" }}
          >
            <Button
              color="#717591"
              title="Save Painting"
              onPress={() => this.saveGeneratedImage()}
            />
          </View> */}
        </View>

        {/* this View wraps middle column */}
        <View style={{ flexDirection: "column", display: this.state.currentBrush == brushTypes.INSPIRE ? "none" : "block" }} >
          {/* this View wraps around the buttons that changes canva view & camera*/}
          <View
            style={{
              flexDirection: "row",
              paddingTop: device.height * 0.01,
              alignContent: "flex-end",
              marginLeft: "auto",
            }}
          ></View>

          {/* this View wraps the two canvas */}
          <View style={{ flexDirection: "row" }}>
            {/* Canvas previews */}
            {/* Show the user canvas if we are in the AI canvas main view */}
            {this.state.showAICanvas && this.state.showPreview && (
              <View
                style={[
                  styles.shadowBoxAICanvas,
                  {
                    width: this.state.USER_CANVASHEIGHT / 1.5,
                    height: this.state.USER_CANVASHEIGHT / 1.5,
                    marginRight: 5,
                  },
                ]}
              >
                <ImageBackground
                  source={this.state.displayedImageData}
                  style={{ filter: this.state.imageFilter }}
                >
                  <Image
                    style={[
                      {
                        width: this.state.USER_CANVASHEIGHT / 1.5,
                        height: this.state.USER_CANVASHEIGHT / 1.5,
                      },
                    ]}
                    source={this.state.userCanvasImageData}
                  />
                </ImageBackground>
              </View>
            )}
            {/* AI Brush preview */}
            {!this.state.showAICanvas && this.state.showPreview && (
              // {this.state.showUserCanvas && this.state.showPreview && (

              <View
                style={[
                  styles.shadowBoxAICanvas,
                  {
                    width: this.state.USER_CANVASHEIGHT / 1.5,
                    height: this.state.USER_CANVASHEIGHT / 1.5,
                    marginRight: 5,
                  },
                ]}
              >
                <Image
                  style={{
                    width: this.state.USER_CANVASHEIGHT / 1.5,
                    height: this.state.USER_CANVASHEIGHT / 1.5,
                  }}
                  source={this.state.aiCanvasImageData}
                />
              </View>
            )}

            {/* this wraps the middle big canvas and buttons */}
            <View style={{ flexDirection: "column" }}>
              {/* this View warps AI canvas */}
              {this.state.showAICanvas && (
                <View id="drawGroup" style={styles.drawGroup}>
                  <View
                    style={[
                      styles.shadowBoxAICanvas,
                      {
                        width: this.state.AI_CANVASWIDTH,
                        height: this.state.AI_CANVASHEIGHT,
                      },
                    ]}
                  >
                    <DrawCanvas
                      ref="drawCanvasRef"
                      setClickClear={(click) =>
                        (this.clearChildAIBrush = click)
                      }
                      style={{
                        backgroundColor: "black",
                        position: "absolute",
                        background: "transparent",
                      }}
                      brushType={this.state.currentBrush}
                      thickness={this.state.thickness}
                      color={this.state.color}
                      // socket={this.state.socket}
                      otherStrokes={this.state.collaboratorStroke}
                      width={this.state.AI_CANVASWIDTH}
                      height={this.state.AI_CANVASHEIGHT}
                      opacity={1}
                      disable={this.state.disableDrawing}
                      isFirstLoadDrawCanvas={this.state.isFirstLoadDrawCanvas}
                    />
                  </View>
                  
                </View>
              )}
              {/* this View wraps generated image & user canvas */}
              {this.state.showUserCanvas && (
                <View id="drawGroup" style={styles.drawGroup}>
                  {/* Displayed image */}
                  <View
                    style={[
                      styles.generatedImageBox,
                      {
                        width: this.state.USER_CANVASWIDTH,
                        height: this.state.USER_CANVASHEIGHT,
                      },
                    ]}
                  >
                    {this.state.displayedImageData != null ? (
                      <Image
                        draggable={false}
                        style={[
                          styles.generatedImage,
                          { filter: this.state.imageFilter },
                        ]}
                        source={{ uri: this.state.displayedImageData }}
                      />
                    ) : null}
                  </View>
                  {/* Main canvas */}
                  {/* Conditionally render the main canvas if toggleDraw == true */}
                  <View
                    style={[
                      styles.shadowBox,
                      {
                        width: this.state.USER_CANVASWIDTH,
                        height: this.state.USER_CANVASHEIGHT,
                      },
                    ]}
                  >
                    {/* USER CANVAS */}
                    <UserCanvas
                      ref="userCanvasRef"
                      setClickClear={(click) =>
                        (this.clearChildUserBrush = click)
                      }
                      style={{
                        position: "absolute",
                        background: "transparent",
                      }}
                      brushType={this.state.currentBrush}
                      userBrushType={this.state.userBrushType}
                      thickness={this.state.thickness}
                      color={this.state.userBrushColor}
                      // socket={this.state.socket}
                      otherStrokes={this.state.collaboratorStroke}
                      width={this.state.USER_CANVASWIDTH}
                      height={this.state.USER_CANVASHEIGHT}
                      opacity={this.state.opacity}
                      disable={this.state.disableDrawing}
                      id="myCanvas"
                    />
                  </View>
                </View>
              )}

              {/* this wraps the buttons at the bottom of canvas */}
              {this.state.currentBrush == brushTypes.AI && (
                <View
                  style={{
                    flexDirection: "column",
                    justifyContent: "space-around",
                  }}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="文字描述"
                    onChangeText={(text) => this.setState({text})}
                    value={this.state.text}
                  />
                  <View style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                  }}> 
                    <View style={{ padding: 5, width: "20%" }}>
                      <Button
                        style={{ marginTop: 10, height: "80" }}
                        color="#5e748a"
                        title="clear"
                        onPress={() => this.clearChildAIBrush()}
                      />
                    </View>

                    <View style={{ padding: 5, width: "20%" }}>
                      <Button
                        mode="contained"
                        style={{ padding: 10 }}
                        onPress={this.grabPixelsGan.bind(this)}
                        color="#88508c"
                        title="GauGAN"
                        disabled={this.state.isLoading}
                      />
                    </View>

                    <View style={{ padding: 5, width: "30%" }}>
                      <Button
                        mode="contained"
                        style={{ padding: 10 }}
                        onPress={this.grabPixelsSd.bind(this)}
                        color="#88508c"
                        title="Stable Diffusion"
                        disabled={this.state.isLoading}
                      />
                    </View>

                    <View style={{ padding: 5, width: "25%" }}>
                      <Button
                        mode="contained"
                        style={{ padding: 10 }}
                        onPress={this.grabPixelsCN.bind(this)}
                        color="#88508c"
                        title="Control Net"
                        disabled={this.state.isLoading}
                      />
                    </View>
                  </View>
                </View>
              )}
              {this.state.currentBrush == brushTypes.USER && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                  }}
                >
                  <View style={{ padding: 5, width: "40%" }}>
                    <Button
                      color="#717591"
                      title="clear strokes"
                      onPress={() => this.clearChildUserBrush()}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={{ flexDirection: "row", display: this.state.currentBrush == brushTypes.INSPIRE ? "block" : "none", width: "80%" }}>
            {/* {this.state.currentBrush == brushTypes.INSPIRE && ( */}
              <View>
                <InspireMode localurl={LOCALURL}>
                </InspireMode>
              </View>
            {/* )} */}
          </View>

        {/* this View wraps the right column */}
        <View style={{ flexDirection: "row" }}>
          {/* AI brush palette buttons */}
          {this.state.currentBrush == brushTypes.AI && (
            <View style={styles.brushesContainer}>
            <SearchBar
              placeholder="搜索颜色"
              lightTheme
              round
              onChangeText={this.searchBrushColor}
              value={this.state.searchValue}
            />
              <ScrollView>
                {this.state.filteredData.map((obj) => {
                  return (
                    <View style={{ margin: 2 }}>
                      <TouchableOpacity
                        style={{
                          padding: 2,
                          borderRadius: 5,
                          backgroundColor: obj.color,
                          borderWidth: this.state.color == obj.color ? 10 : 0,
                          borderColor: 
                            obj.color == "#efefef" ? "#d1d1d1" : "#f2f2eb",

                          // backgroundColor:
                          //   this.state.color == obj.color
                          //     ? "#3d3d3d"
                          //     : "#dbdbdb", //obj.color == "#efefef" ? "#dbdbdb" : "white",
                        }}
                        onPress={() => {
                          this.setState({ color: obj.color });
                        }}
                        disabled={this.state.disableButtons}
                      >
                        <Image
                          draggable={false}
                          style={styles.brushes}
                          source={obj.logo}
                        />
                        <Text
                          style={{
                            fontSize: device.height * 0.012,
                            color: obj.color == "#efefef" ? "#3d3d3d" : "white",

                            // color:
                            //   this.state.color == obj.color ? "white" : "black",
                            // fontWeight: "500",
                          }}
                        >
                          {obj.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Render the slider and the brush legend */}
            </View>
          )}

          {/* Style buttons */}
          {this.state.currentBrush == brushTypes.STYLE && (
            <View style={styles.brushesContainer}>
              <ScrollView>
                {/* None style button */}
                <View style={{ margin: 2 }}>
                  <TouchableOpacity
                    style={[
                      styles.functionButton,
                      {
                        backgroundColor:
                          this.state.styleBrushType == "None"
                            ? "#3d3d3d"
                            : "#dbdbdb",
                      },
                    ]}
                    onPress={() => {
                      this.setState((prevState) => ({
                        ...prevState,
                        displayedImageData: this.state.generatedImageData,
                        styleBrushType: "None",
                      }));
                    }}
                    disabled={this.state.disableButtons}
                  >
                    <Image
                      style={styles.brushes}
                      source={require("./resources/none_style.png")}
                    />
                    <Text
                      style={{
                        color:
                          this.state.styleBrushType == "None"
                            ? "white"
                            : "black",
                        fontSize: device.height * 0.015,
                        fontWeight: "500",
                      }}
                    >
                      {" "}
                      None{" "}
                    </Text>
                  </TouchableOpacity>
                </View>
                {/* Programmatically render all style options */}
                {styleTransferOptions.styles.map((obj) => {
                  return (
                    <View style={{ margin: 2 }}>
                      <TouchableOpacity
                        disabled={this.state.disableButtons}
                        style={[
                          styles.functionButton,
                          {
                            backgroundColor:
                              this.state.styleBrushType == obj.name
                                ? "#3d3d3d"
                                : "#dbdbdb",
                          },
                        ]}
                        onPress={() => {
                          this.sendRequestStyleHelper(obj.name);
                          this.setState((prevState) => ({
                            styleBrushType: obj.name,
                          }));
                        }}
                      >
                        <Image style={styles.brushes} source={obj.image_url} />
                        <Text
                          style={{
                            color:
                              this.state.styleBrushType == obj.name
                                ? "white"
                                : "black",
                            fontSize: device.height * 0.015,
                            fontWeight: "500",
                          }}
                        >
                          {obj.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Filter buttons */}
          {this.state.currentBrush == brushTypes.FILTER && (
            <View style={styles.brushesContainer}>
              <ScrollView>
                {/* None filter button */}
                <View style={{ margin: 2 }}>
                  <TouchableOpacity
                    style={[
                      styles.functionButton,
                      {
                        backgroundColor:
                          this.state.filterBrushType == "None"
                            ? "#3d3d3d"
                            : "#dbdbdb",
                      },
                    ]}
                    onPress={() => {
                      this.setState((prevState) => ({
                        ...prevState,
                        imageFilter: "",
                        filterBrushType: "None",
                      }));
                      // sendSwitchFilter(this.state.socket, "", "None")
                    }}
                    disabled={this.state.disableButtons}
                  >
                    <Image
                      style={styles.brushes}
                      source={require("./resources/none_style.png")}
                    />
                    <Text
                      style={{
                        color:
                          this.state.filterBrushType == "None"
                            ? "white"
                            : "black",
                        fontSize: device.height * 0.015,
                        fontWeight: "500",
                      }}
                    >
                      {" "}
                      None{" "}
                    </Text>
                  </TouchableOpacity>
                </View>
                {/* Programmatically render all filter options */}
                {filterOptions.filters.map((obj) => {
                  return (
                    <View style={{ margin: 2 }}>
                      <TouchableOpacity
                        disabled={this.state.disableButtons}
                        style={[
                          styles.functionButton,
                          {
                            backgroundColor:
                              this.state.filterBrushType == obj.name
                                ? "#3d3d3d"
                                : "#dbdbdb",
                          },
                        ]}
                        onPress={() => {
                          this.setState((prevState) => ({
                            imageFilter: obj.filter,
                            filterBrushType: obj.name,
                          }));
                          // sendSwitchFilter(this.state.socket, obj.filter, obj.name)
                        }}
                      >
                        <Image style={styles.brushes} source={obj.image_url} />
                        <Text
                          style={{
                            color:
                              this.state.filterBrushType == obj.name
                                ? "white"
                                : "black",
                            fontSize: device.height * 0.015,
                            fontWeight: "500",
                          }}
                        >
                          {obj.label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* User Brush buttons */}
        {this.state.currentBrush == brushTypes.USER && (
          <View style={styles.brushesContainer}>
            {/* <View style={{ height: device.height * 0.4 }}> */}
            <ScrollView>
              {/* Programmatically render all options */}
              {userBrushesOptions.userBrushes.map((obj) => {
                return (
                  <View style={{ margin: 2 }}>
                    <TouchableOpacity
                      style={[
                        styles.functionButton,
                        {
                          backgroundColor:
                            this.state.userBrushType == obj.name
                              ? "#3d3d3d"
                              : "white",
                        },
                      ]}
                      onPress={() => {
                        this.setState((prevState) => ({
                          ...prevState,
                          userBrushType: obj.name,
                        }));
                        // sendSwitchUserBrush(this.state.socket,obj.name,this.state.userBrushColor)
                      }}
                    >
                      <Image
                        style={styles.userBrushes}
                        source={obj.image_url}
                      />
                      <Text
                        style={{
                          color:
                            this.state.userBrushType == obj.name
                              ? "white"
                              : "#2e2e2e",
                          fontSize: device.height * 0.015,
                        }}
                      >
                        {obj.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            {/* </View> */}
          </View>
        )}

        {/* this View wraps the spinner */}
        {/* Spinner is recommended to be at the root level */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator
            animating={this.state.isLoading}
            size={"large"}
            color={"#545454"}
            style={{ transform: [{ scale: 3 }] }}
          />
        </View>

        {/* this View wraps the size indicator */}
        {this.state.isChangeSize == true && (
          <View style={styles.circleContainer}>
            <Text style={{ color: "#4d4d4d", fontWeight: "bold" }}>
              Size Preview:
            </Text>
            <Ionicons
              style={{
                opacity: this.state.opacity,
                justifyContent: "center",
                alignItems: "center",
                margin: "auto",
              }}
              name="ellipse"
              color={
                this.state.currentBrush == brushTypes.USER
                  ? this.state.userBrushColor
                  : this.state.color
              }
              size={this.state.thickness * 1.2}
            ></Ionicons>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "white",
  },
  generatedImageBox: {
    userDrag: "none",
    userSelect: "none",
    backgroundColor: "transparent",
    position: "absolute",
  },
  generatedImage: {
    width: "100%",
    height: "100%",
    userDrag: "none",
    userSelect: "none",
  },
  shadowBoxAICanvas: {
    shadowColor: "grey",
    shadowRadius: 20,
    position: "relative",
  },
  shadowBox: {
    shadowColor: "grey",
    shadowRadius: 20,
    position: "relative",
  },
  functionButton: {
    padding: 4,
    borderRadius: 5,
  },

  drawGroup: {
    flexDirection: "row",
    // alignItems: "center",
    // justifyContent: "center",
  },
  strokeGroup: {
    flexDirection: "column",
    alignItems: "center",
  },
  toolGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  brushes: {
    margin: 0,
    height: device.height * 0.06,
    width: device.height * 0.06 * 1.8,
    padding: 0,
    userDrag: "none",
    userSelect: "none",
  },
  donwloadButton: {
    margin: 0,
    height: device.height * 0.145 * 0.4,
    width: device.height * 0.145 * 0.41,
    padding: 0,
    userDrag: "none",
    userSelect: "none",
  },
  brushesContainer: {
    flexDirection: "column",
    justifyContent: "space-around",
    alignItems: "center",
    height: device.height,
    borderLeftColor: "#C8C8C8",
    backgroundColor: "#f2f2eb",
    borderLeftWidth: 3,
  },
  userBrushes: {
    justifyContent: "start",
    margin: 0,
    height: device.height * 0.06,
    width: device.height * 0.06 * 1.8,
    paddingTop: 0,
  },
  spinnerTextStyle: {
    color: "transparent",
  },
  spinnerContainer: {
    position: "absolute",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    left: device.width / 2,
    top: device.height / 2.5,
  },
  circleContainer: {
    height: device.height * 0.35,
    width: device.height * 0.3,
    marginBottom: "0.5em",
    position: "absolute",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(245, 245, 237, 0.8)",
    borderRadius: 10,
    left: device.width / 2,
    top: device.height / 3,
  },

  swatch: {
    padding: "5px",
    background: "#fff",
    borderRadius: "1px",
    boxShadow: "0 0 0 1px rgba(0,0,0,.1)",
    display: "inline-block",
    cursor: "pointer",
  },
  popover: {
    position: "absolute",
    zIndex: "2",
  },
  cover: {
    position: "fixed",
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
  },
  color: {
    width: "36px",
    height: "14px",
    borderRadius: "2px",
  },
  Cat: {
    color: "pink",
    backgroundColor: "pink",
  },
  input: {
    height: 45,
    margin: 12,
    borderRadius: 5,
    borderWidth: 1,
    padding: 8,
  },
});

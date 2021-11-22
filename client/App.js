import React, { Component } from "react";
import {
  ActivityIndicator,
  AppRegistry,
  StyleSheet,
  View,
  Button,
  Alert,
  Dimensions,
  Image,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
import DrawCanvas from "./components/DrawCanvas";
import UserCanvas from "./components/UserCanvas";
import { FontAwesome5 } from "@expo/vector-icons";

import Slider from "@react-native-community/slider";
// import Snackbar from 'react-native-snackbar';
import axios from "axios";
import colorMap from "./constants/colorMap.js";
import brushTypes from "./constants/brushTypes.js";
import userBrushes from "./constants/userBrushes.js";
import styleTransferOptions from "./constants/styleTransferOptions.js";
import userBrushesOptions from "./constants/userBrushesOptions.js";
import messageKinds from "./constants/messageKinds.js";
import {
  onOpen,
  onClose,
  onMessage,
  onError,
  sendStroke,
  sendStrokeEnd,
  sendStrokeStart,
} from "./api/websocketApi.js";
import { sendRequest, sendRequestStyle } from "./api/modelApi.js";
import { hello, generateStyle } from "./styles/styles.js";
import Point from "./classes/Point";
import { startClock } from "react-native-reanimated";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
// import ColorPicker from './components/Colorpicker';
import ColorPicker from "react-native-wheel-color-picker";
import Spinner from "react-native-loading-spinner-overlay";
import {
  BallIndicator,
  BarIndicator,
  DotIndicator,
  MaterialIndicator,
  PacmanIndicator,
  PulseIndicator,
  SkypeIndicator,
  UIActivityIndicator,
  WaveIndicator,
} from "react-native-indicators";
import { triggerBase64Download } from "react-base64-downloader";
import { SketchPicker } from "react-color";
import { EyeDropper } from "react-eyedrop";
import backendConstants from "./constants/backendUrl";

var device = Dimensions.get("window");
const CANVASWIDTH = device.width * 0.33;
const CANVASHEIGHT = device.width * 0.33;

// Connect to Go backend
// for web
// for android
// let this.state.socket = new WebSocket('ws://10.0.2.2:8080/ws');

// Create dynamic style based on device width/height
// const styles = StyleSheet.create(generateStyle(device));

export default class App extends Component {
  // React state: store the image data
  state = {
    AI_CANVASWIDTH: device.width * 0.33,
    AI_CANVASHEIGHT: device.width * 0.33,

    USER_CANVASWIDTH: device.width * 0.33,
    USER_CANVASHEIGHT: device.width * 0.33,

    imageData: "data:image/png;base64,", // raw image data of the segmentation image
    generatedImageData: "data:image/png;base64,", // raw image data of the generated image
    stylizedImageData: "data:image/png;base64,", // raw image data of stylized generated image
    displayedImageData: "data:image/png;base64,", // raw image data of displayed image
    style: "none", // selected style
    color: "#384f83", // pen color
    userBrushColor: "#00FF00",
    userBrushBase64: "data:image/png;base64,", // user brush
    userBrushType: userBrushes.PENCIL,
    styleBrushType: "None",
    thickness: 10, // stroke thickness
    ownStroke: [], // client stroke data
    collaboratorStroke: [], // collaborator data
    opacity: 1, // Toggle between the drawing canvas and generated image.
    displayColorPicker: false,
    disableDrawing: false, // used when eyedropper is active
    // 1 = show drawing canvas, 0 = show image
    // socket: new WebSocket('ws://localhost:8080/ws')
    socket:
      Platform.OS === "web"
        ? new WebSocket(`ws://${backendConstants.BACKEND_URL}:8080/ws`)
        : new WebSocket(`ws://${backendConstants.BACKEND_URL}:8080/ws`),
    canvasWidth: CANVASWIDTH,
    canvasHeight: CANVASHEIGHT,
    currentBrush: brushTypes.AI,

    isLoading: true, //for loading spinner
  };

  constructor(props) {
    super(props);
    this.sendRequestHelper = this.sendRequestHelper.bind(this);
  }

  // Run when component is first rendered
  componentDidMount() {
    console.log("Attempting connection");

    // Setup this.state.socket handlers
    this.state.socket.onopen = () => {
      console.log(
        "CANVAS DIMS ARE",
        this.state.canvasWidth,
        this.state.canvasHeight
      );

      onOpen(this.state.socket, {
        canvasWidth: this.state.canvasWidth,
        canvasHeight: this.state.canvasHeight,
      });
    };
    this.state.socket.onclose = (event) => {
      onClose(event);
    };
    this.state.socket.onerror = (error) => {
      onError(error);
    };

    this.state.socket.onmessage = (event) => {
      this.onMesageHandler(event);
    };

    this.setState((prevState) => ({
      ...prevState,
      isLoading: false,
    }));
  }

  // Fetch image data from canvas
  // Then call sendRequest to send the data to backend
  grabPixels = async () => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
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

    this.state.socket.send(
      JSON.stringify({
        kind: messageKinds.MESSAGE_GENERATE,
        data: {
          imageData: this.state.imageData,
        },
      })
    );
  };
  // Send a request to the model server to stylize the generated painting
  sendRequestStyleHelper = async (newStyle) => {
    this.setState((prevState) => ({
      ...prevState,
      isLoading: true,
    }));

    this.state.socket.send(
      JSON.stringify({
        kind: messageKinds.MESSAGE_STYLIZE,
        data: {
          imageData: this.state.generatedImageData,
          style: newStyle,
        },
      })
    );
  };

  saveGeneratedImage = () => {
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
  };

  handleThickness = (sliderValue) => {
    this.setState((prevState) => ({
      ...prevState,
      thickness: sliderValue,
    }));
    console.log("thickness is now", sliderValue);
  };

  handleOpacity = (sliderValue) => {
    this.setState((prevState) => ({
      ...prevState,
      opacity: sliderValue,
    }));
    console.log("opacity is now", sliderValue);
  };

  onMesageHandler = (event) => {
    var messages = event.data.split("\n");

    for (var i = 0; i < messages.length; i++) {
      var message = JSON.parse(messages[i]);
      // console.log('Received message is', message);
      this.executeMessage(message);
    }
    // console.log('B stringified is', JSON.stringify(this.canvas.getPaths()));
  };

  // Convert object of rgb {r: g: b:} to hex string
  rgbToHex = (d) => {
    const red = d.r;
    const green = d.g;
    const blue = d.b;
    const rgb = (red << 16) | (green << 8) | (blue << 0);
    return "#" + (0x1000000 + rgb).toString(16).slice(1);
  };

  handleChangeEydropper = ({ rgb, hex }) => {
    console.log("color is", rgb);
    this.setState((prevState) => ({
      ...prevState,
      userBrushColor:
        "#" +
        rgb
          .slice(4, -1)
          .split(",")
          .map((x) => (+x).toString(16).padStart(2, 0))
          .join(""),
    }));
  };

  handleOnPickStart = () => {
    this.setState((prevState) => ({
      ...prevState,
      disableDrawing: true,
    }));
  };

  handleOnPickEnd = () => {
    this.setState((prevState) => ({
      ...prevState,
      disableDrawing: false,
    }));
  };

  executeMessage = (message) => {
    switch (message.kind) {
      case messageKinds.MESSAGE_STROKE_START:
        // Disabled collab drawing
        // console.log('RECEIVED STROKE STARTT', message);
        // // Append collaborator stroke
        // this.setState(prevState => ({
        //   ...prevState,
        //   collaboratorStroke: [
        //     ...prevState.collaboratorStroke,
        //     new Point(
        //       message.point.x * CANVASWIDTH,
        //       message.point.y * CANVASHEIGHT,
        //       message.thickness,
        //       message.color,
        //       'start',
        //     ),
        //   ],
        // }));

        break;
      case messageKinds.MESSAGE_STROKE:
        // Disabled collab drawing
        // console.log("received collaborator point", message)
        // Append collaborator stroke
        // this.setState(prevState => ({
        //   ...prevState,
        //   collaboratorStroke: [
        //     ...prevState.collaboratorStroke,
        //     new Point(
        //       message.point.x * CANVASWIDTH,
        //       message.point.y * CANVASHEIGHT,
        //       message.thickness,
        //       message.color,
        //       'move',
        //     ),
        //   ],
        // }));
        break;
      case messageKinds.MESSAGE_STROKE_END:
        // Disabled collab drawing
        // this.setState(prevState => ({
        //   ...prevState,
        //   collaboratorStroke: [],
        // }));

        break;
      // User receives a generated image broadcasted from another user
      case messageKinds.MESSAGE_GENERATE:
        console.log("got generate mesage here", message);
        this.setState((prevState) => ({
          ...prevState,
          generatedImageData: message.imageData,
          displayedImageData: message.imageData,
        }));

        this.setState((prevState) => ({
          ...prevState,
          isLoading: false,
        }));

        break;
      // User received a stylized image broadcasted from another user
      case messageKinds.MESSAGE_STYLIZE:
        console.log("image stylize", message);
        this.setState((prevState) => ({
          ...prevState,
          style: message.style,
          stylizedImageData: message.imageData,
          displayedImageData: message.imageData,
        }));

        this.setState((prevState) => ({
          ...prevState,
          isLoading: false,
        }));

        break;

      case messageKinds.MESSAGE_SAVE:
        this.setState((prevState) => ({
          ...prevState,
          isLoading: false,
        }));

        // FIXME: Will probably only work on expo web, untested on android/ios
        if (message.savedImageData != "") {
          triggerBase64Download(message.savedImageData, `Painting`);
        } else {
          alert("Please generate a painting with the AI brush first.");
        }
        break;
    }
  };

  setCanvasSideBySide = () => {
    // To fix user canvas no redisplaying
    for (var i = 0; i < 2; i++) {
      setTimeout(() => {
        this.loadUserCanvas();
      }, 100);
  
    }

    if (this.state.USER_CANVASWIDTH == this.state.AI_CANVASWIDTH) return;
    // this.refs.userCanvasRef.loadData();

    // Save the drawcanvas and usercanvas data
    var getImageAICanvas = this.refs.drawCanvasRef
      .getBase64()
      .then((aicanvas) => {
        var getImageUserCanvas = this.refs.userCanvasRef
          .getBase64()
          .then((usercanvas) => {
            this.setState(
              (prevState) => ({
                ...prevState,
                USER_CANVASWIDTH: device.width * 0.33,
                USER_CANVASHEIGHT: device.width * 0.33,
                AI_CANVASWIDTH: device.width * 0.33,
                AI_CANVASHEIGHT: device.width * 0.33,
              }),
              () => {
                this.refs.drawCanvasRef.loadData();
                this.refs.userCanvasRef.loadData();

              }
            );

            // Load the data base64
          });
      });
  };

  setCanvasOneByOne = () => {
    // this.refs.drawCanvasRef.loadData();
    for (var i = 0; i < 2; i++) {
      setTimeout(() => {
        this.loadUserCanvas();
      }, 100);
  
    }

    // Save the drawcanvas and usercanvas data
    var getImageAICanvas = this.refs.drawCanvasRef
      .getBase64()
      .then((aicanvas) => {
        var getImageUserCanvas = this.refs.userCanvasRef
          .getBase64()
          .then((usercanvas) => {
            if (this.state.USER_CANVASWIDTH < this.state.AI_CANVASWIDTH) {
              this.setState(
                (prevState) => ({
                  ...prevState,
                  USER_CANVASWIDTH: device.width * 0.33,
                  USER_CANVASHEIGHT: device.width * 0.33,
                  AI_CANVASWIDTH: device.width * 0.16,
                  AI_CANVASHEIGHT: device.width * 0.16,
                }),
                () => {
                  this.refs.drawCanvasRef.loadData();
                  this.refs.userCanvasRef.loadData();

                }
              );
            } else {
              this.setState(
                (prevState) => ({
                  ...prevState,
                  USER_CANVASWIDTH: device.width * 0.16,
                  USER_CANVASHEIGHT: device.width * 0.16,
                  AI_CANVASWIDTH: device.width * 0.33,
                  AI_CANVASHEIGHT: device.width * 0.33,
                }),
                () => {
                  this.refs.userCanvasRef.loadData();
                  // this.refs.userCanvasRef.loadData();


                }
              );
            }

            // this.refs.drawCanvasRef.loadData(aicanvas);

            // Load the data base64
          });
      });
  };

  loadUserCanvas = () => {
    this.refs.userCanvasRef.loadData();
  }

  render() {
    let brushSlider = (
      <View style={{ flexDirection: "column", padding: 5 }}>
        <View>
          <Text style={{ textAlign: "center", fontSize: 18, padding: 2 }}>
            Size
          </Text>
        </View>

        <Slider
          style={{
            width: 150,
            margin: "auto",
            height: device.height * 0.03,
          }}
          value={this.state.thickness}
          minimumValue={1}
          maximumValue={CANVASWIDTH / 4}
          minimumTrackTintColor="#000000"
          maximumTrackTintColor="#000000"
          onValueChange={this.handleThickness}
        />

        {this.state.currentBrush ==  brushTypes.USER &&
        <View>
        <View>
          <Text style={{ textAlign: "center", fontSize: 18, padding: 2 }}>
            Transparency
          </Text>
        </View>

        <Slider
          style={{
            width: 150,
            margin: "auto",
            height: device.height * 0.03,
          }}
          value={this.state.opacity}
          minimumValue={0.0}
          maximumValue={1.0}
          minimumTrackTintColor="#000000"
          maximumTrackTintColor="#000000"
          onValueChange={this.handleOpacity}
        />

        </View>
        
        }



        <View style={{ height: device.height * 0.18, marginBottom: "0.5em" }}>
          <Ionicons
            style={{ margin: "auto" }}
            name="ellipse"
            color={
              this.state.currentBrush == brushTypes.USER
                ? this.state.userBrushColor
                : this.state.color
            }
            size={this.state.thickness}
          ></Ionicons>
        </View>
      </View>
    );

    return (
      <View style={styles.container}>
        {/* this View wraps the left column */}
        <View>
          <TouchableOpacity
            onPress={() =>
              this.setState((prevState) => ({
                ...prevState,
                currentBrush: brushTypes.AI,
              }))
            }
          >
            <Image
              style={[
                styles.brushes,
                {
                  opacity: this.state.currentBrush == brushTypes.AI ? 1 : 0.72,
                },
              ]}
              source={require("./resources/AIBrush.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              this.setState((prevState) => ({
                ...prevState,
                currentBrush: brushTypes.STYLE,
              }))
            }
          >
            <Image
              style={[
                styles.brushes,
                {
                  opacity:
                    this.state.currentBrush == brushTypes.STYLE ? 1 : 0.72,
                },
              ]}
              source={require("./resources/styleBrush.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              this.setState((prevState) => ({
                ...prevState,
                currentBrush: brushTypes.USER,
              }))
            }
          >
            <Image
              style={[
                styles.brushes,
                {
                  opacity:
                    this.state.currentBrush == brushTypes.USER ? 1 : 0.72,
                },
              ]}
              source={require("./resources/userBrush.png")}
            />
          </TouchableOpacity>
          {this.state.currentBrush == brushTypes.USER && (
            <View>
              <View>
                {/* <Ionicons
            style={{ margin: "auto" }}
            name="eyedrop-outline"
            size={32}
            color={
              "black"
              // this.state.currentBrush == brushTypes.USER
              //   ? this.state.userBrushColor
              //   : this.state.color
            }
          ></Ionicons> */}

                <EyeDropper
                  onPickStart={this.handleOnPickStart}
                  onPickEnd={this.handleOnPickEnd}
                  onChange={this.handleChangeEydropper}
                >
                  Pick Color
                </EyeDropper>
              </View>
              <SketchPicker
                style={{ backgroundColor: this.state.userBrushColor }}
                color={this.state.userBrushColor}
                onChangeComplete={(color) => {
                  this.setState((prevState) => ({
                    ...prevState,
                    userBrushColor: this.rgbToHex(color.rgb),
                  }));
                }}
              />
            </View>
          )}

          {brushSlider}
        </View>

        {/* this View wraps middle column */}
        <View style={{ flexDirection: "column" }}>
          {/* this View wraps around the buttons that changes canva view & camera*/}
          <View
            style={{
              flexDirection: "row",
              paddingTop: device.height * 0.01,
              alignContent: "flex-end",
              marginLeft: "auto",
            }}
          >
            <TouchableOpacity
              style={{ margin: 5 }}
              onPress={() => this.saveGeneratedImage()}
            >
              <Image
                style={styles.donwloadButton}
                source={require("./resources/DownloadButton.png")}
              />
            </TouchableOpacity>

            <Button
              style={{ margin: 5 }}
              title="View 1"
              color="#957DAD"
              onPress={() => {
                this.setCanvasOneByOne();
              }}
            />
            <Button
              style={{ margin: 5 }}
              title="View 2"
              onPress={() => {
                this.setCanvasSideBySide();
              }}
            />

          </View>

          {/* this View wraps the two canvas */}
          <View style={{ flexDirection: "row"}}>
            {/* this View warps AI canvas */}
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
                  setClickClear={(click) => (this.clearChildAIBrush = click)}
                  style={{
                    backgroundColor: "black",
                    position: "absolute",
                    background: "transparent",
                  }}
                  brushType={this.state.currentBrush}
                  thickness={this.state.thickness}
                  color={this.state.color}
                  socket={this.state.socket}
                  otherStrokes={this.state.collaboratorStroke}
                  width={this.state.AI_CANVASWIDTH}
                  height={this.state.AI_CANVASHEIGHT}
                  opacity={1}
                  disable={this.state.disableDrawing}
                />
              </View>
            </View>

            {/* this View wraps generated image & user canvas */}
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
                    style={styles.generatedImage}
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
                  setClickClear={(click) => (this.clearChildUserBrush = click)}
                  style={{ position: "absolute", background: "transparent" }}
                  brushType={this.state.currentBrush}
                  userBrushType={this.state.userBrushType}
                  thickness={this.state.thickness}
                  color={this.state.userBrushColor}
                  socket={this.state.socket}
                  otherStrokes={this.state.collaboratorStroke}
                  width={this.state.USER_CANVASWIDTH}
                  height={this.state.USER_CANVASHEIGHT}
                  opacity={this.state.opacity}
                  disable={this.state.disableDrawing}
                  id="myCanvas"
                />
              </View>
            </View>
          </View>

          {/* this wraps the buttons at the bottom of canvas */}
          {this.state.currentBrush == brushTypes.AI && (
            <View
              style={{ flexDirection: "row", justifyContent: "space-around" }}
            >
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
                  onPress={this.grabPixels.bind(this)}
                  color="#88508c"
                  title="generate"
                />
              </View>
            </View>
          )}
          {this.state.currentBrush == brushTypes.USER && (
            <View
              style={{ flexDirection: "row", justifyContent: "space-around" }}
            >
              <View style={{ padding: 5, width: "20%" }}></View>
              <View style={{ padding: 5, width: "20%" }}>
                <Button
                  color="#717591"
                  title="clear strokes"
                  onPress={() => this.clearChildUserBrush()}
                />
              </View>
            </View>
          )}
        </View>

        {/* this View wraps the right column */}
        <View style={{ flexDirection: "row" }}>
          {/* AI brush palette buttons */}
          {this.state.currentBrush == brushTypes.AI && (
            <View style={styles.brushesContainer}>
              <ScrollView>
                {colorMap.colors.map((obj) => {
                  return (
                    <View style={{ margin: 0 }}>
                      <TouchableOpacity
                        style={{
                          padding: 4,
                          borderTopLeftRadius:
                            this.state.color == obj.color ? 0 : 5,
                          borderBottomLeftRadius:
                            this.state.color == obj.color ? 0 : 5,
                          borderTopRightRadius: 5,
                          borderBottomRightRadius: 5,
                          backgroundColor: obj.color,
                          borderLeftWidth:
                            this.state.color == obj.color ? 10 : 0,
                          borderColor:
                            obj.color == "#efefef" ? "grey" : "#8a8a8a",
                        }}
                        onPress={() => {
                          this.setState({ color: obj.color });
                        }}
                      >
                        <Image
                          draggable={false}
                          style={styles.brushes}
                          source={obj.logo}
                        />
                        <Text
                          style={{
                            color: obj.color == "#efefef" ? "#3d3d3d" : "white",
                            fontSize: device.height * 0.025,
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
              {/* None style button */}
              <ScrollView>
                <View style={{ margin: 2 }}>
                  <TouchableOpacity
                    style={[
                      styles.functionButton,
                      {
                        backgroundColor:
                          this.state.styleBrushType == "None"
                            ? "#3d3d3d"
                            : "grey",
                      },
                    ]}
                    onPress={() => {
                      this.setState((prevState) => ({
                        ...prevState,
                        displayedImageData: this.state.generatedImageData,
                        styleBrushType: "None",
                      }));
                    }}
                  >
                    <Image
                      style={styles.brushes}
                      source={require("./resources/none_style.png")}
                    />
                    <Text style={{ color: "white", fontSize: 20 }}> None </Text>
                  </TouchableOpacity>
                </View>
                {/* Programmatically render all style options */}
                {styleTransferOptions.styles.map((obj) => {
                  return (
                    <View style={{ margin: 2 }}>
                      <TouchableOpacity
                        style={[
                          styles.functionButton,
                          {
                            backgroundColor:
                              this.state.styleBrushType == obj.name
                                ? "#3d3d3d"
                                : "grey",
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
                            color: "white",
                            fontSize: device.height * 0.024,
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
                              ? "#999999"
                              : "#ced2d9",
                        },
                      ]}
                      onPress={() => {
                        this.setState((prevState) => ({
                          ...prevState,
                          userBrushType: obj.name,
                        }));
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
                          fontSize: device.height * 0.024,
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
    borderWidth: 8,
    backgroundColor: "transparent",
    borderColor: "#fffef5",
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
    height: device.height * 0.145,
    width: device.height * 0.145 * 1.8,
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
    height: device.height * 0.12,
    width: device.height * 0.12 * 2.5,
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
});

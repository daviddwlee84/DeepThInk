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
  ImageBackground,
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
import filterOptions from "./constants/filterBrushOptions.js";

import messageKinds from "./constants/messageKinds.js";
import {
  onOpen,
  onClose,
  onMessage,
  onError,
  sendStroke,
  sendStrokeEnd,
  sendStrokeStart,
  sendSwitchBrush,
  sendSwitchFilter,
  sendSwitchUserBrush,
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
import { ChromePicker } from "react-color";
import { EyeDropper } from "react-eyedrop";
import backendConstants from "./constants/backendUrl";
import { FontAwesome } from "@expo/vector-icons";
import { RgbaColorPicker } from "react-colorful";

var device = Dimensions.get("window");
const CANVASWIDTH = device.height * 0.9;
const CANVASHEIGHT = device.height * 0.9;

// Connect to Go backend
// for web
// for android
// let this.state.socket = new WebSocket('ws://10.0.2.2:8080/ws');

// Create dynamic style based on device width/height
// const styles = StyleSheet.create(generateStyle(device));

const CustomEyeDropper = ({ onClick, disabled }) => (
  <TouchableOpacity
    style={{
      backgroundColor: disabled ? "#999999" : "#f2f2eb",
      borderRadius: 10,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      width: device.height * 0.25,
    }}
    onPress={onClick}
  >
    <Ionicons name="eyedrop" size={25} color={"grey"}></Ionicons>
    <Text
      style={{
        marginLeft: 5,
        color: "#363636",
        fontWeight: "bold",
        fontSize: 16,
      }}
    >
      Pick a Color
    </Text>
  </TouchableOpacity>
);

export default class App extends Component {
  // React state: store the image data
  state = {
    showAICanvas: true,
    showUserCanvas: false,

    rightColumnWidth: device.height * 0.11 * 1.8,
    rightColumnMargin: device.height * 0.007,

    leftColumnWidth: device.height * 0.25,
    leftColumnLeftMargin: device.height * 0.007,
    //device.width - (device.height * (0.85 * 1.25 + 0.11 * 1.8 + 0.25 + 0.007 + 0.3))

    //canvas + small canvas, right col, left col, marginleft of left col
    AI_CANVASWIDTH: Math.min(
      (device.width - device.height * (0.11 * 1.8 + 0.25 + 0.007 + 0.15)) * 0.8,
      device.height * 0.85
    ),
    // device.height * (0.85 * 1.25 + 0.11 * 1.8 + 0.25 + 0.007) > device.width
    //   ? device.height * 0.5
    //   : device.height * 0.85,
    AI_CANVASHEIGHT: Math.min(
      (device.width - device.height * (0.11 * 1.8 + 0.25 + 0.007 + 0.15)) * 0.8,
      device.height * 0.85
    ),
    //AI_CANVASWIDTH: device.height * 0.85,
    //AI_CANVASHEIGHT: device.height * 0.85,

    //USER_CANVASWIDTH: device.height * 0.85,
    //USER_CANVASHEIGHT: device.height * 0.85,
    USER_CANVASWIDTH: Math.min(
      (device.width - device.height * (0.11 * 1.8 + 0.25 + 0.007 + 0.15)) * 0.8,
      device.height * 0.85
    ),
    USER_CANVASHEIGHT: Math.min(
      (device.width - device.height * (0.11 * 1.8 + 0.25 + 0.007 + 0.15)) * 0.8,
      device.height * 0.85
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
    socket:
      Platform.OS === "web"
        ? new WebSocket(`ws://${backendConstants.BACKEND_URL}:8080/ws`)
        : new WebSocket(`ws://${backendConstants.BACKEND_URL}:8080/ws`),
    canvasWidth: CANVASWIDTH,
    canvasHeight: CANVASHEIGHT,
    currentBrush: brushTypes.AI,

    showImageForEyeDropper: false,
    showPreview: true, // show the preview of the other canvas at the top left corner

    isLoading: true, //for loading spinner
    isChangeSize: false, //for slider

    isFirstLoadDrawCanvas: true, // show a default segmentation map for the first time in the AI canvas
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
      isFirstLoadDrawCanvas: false,
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
  hex2rgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // return {r, g, b} // return an object
    return { r: r, g: g, b: b, a: 1 };
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
      colorPickerDisplay: this.hex2rgb(hex),
    }));
  };

  handleOnPickStart = () => {
    this.setState((prevState) => ({
      ...prevState,
      disableDrawing: true,
      showImageForEyeDropper: true,
      showPreview: true,
      disableButtons: true,
    }));

    // Request a full image of the user canvas with generated image
    this.saveGeneratedImage();
    this.disableUserCanvas();
  };

  handleOnPickEnd = () => {
    this.setState((prevState) => ({
      ...prevState,
      disableDrawing: false,
      showImageForEyeDropper: false,
      showPreview: true,
      enableUserCanvas: true,
      disableButtons: false,
    }));
    this.loadUserCanvas();
  };

  executeMessage = (message) => {
    switch (message.kind) {
      case messageKinds.MESSAGE_STROKE_START:
        // Disabled collab drawing
        console.log('Received stroke start', message);
        // Append collaborator stroke
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [
            ...prevState.collaboratorStroke,
            new Point(
              message.point.x * this.state.AI_CANVASWIDTH,
              message.point.y * this.state.AI_CANVASHEIGHT,
              message.thickness,
              message.color,
              'start',
              message.point.canvasType
            ),
          ],
        }));

        break;
      case messageKinds.MESSAGE_STROKE:
        // Disabled collab drawing
        // Append collaborator stroke
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [
            ...prevState.collaboratorStroke,
            new Point(
              message.point.x * this.state.AI_CANVASWIDTH,
              message.point.y * this.state.AI_CANVASHEIGHT,
              message.thickness,
              message.color,
              'move',
              message.point.canvasType,
            ),
          ],
        }));
        break;
      case messageKinds.MESSAGE_STROKE_END:
        console.log("received stroke end")
        // Disabled collab drawing
        this.setState(prevState => ({
          ...prevState,
          collaboratorStroke: [],
        }));

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
          styleBrushType: message.style,
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

        if (this.state.showImageForEyeDropper) {
          this.setState((prevState) => ({
            ...prevState,
            finalImageData: message.savedImageData,
          }));
        } else {
          alert("Image saved to cloud storage!");
          // triggerBase64Download(message.savedImageData, `Painting`);
        }

        break;
      case messageKinds.MESSAGE_SWITCH_BRUSH: 
      console.log("got switch from collaborator", message)
        if (message.brushType == "ai") {
          this.switchToAICanvas();

        } else if (message.brushType == "filter") {
          this.switchToFilterBrush();
        } else if (message.brushType == "style") {
          this.switchToStyleBrush();
        } else if (message.brushType == "user") {
          this.switchToUserBrush();
        }
        break;
      case messageKinds.MESSAGE_SWITCH_FILTER:
        this.setState((prevState) => ({
          ...prevState,
          imageFilter: message.filterType,
          filterBrushType: message.filterName
        }));    
        break;

      case messageKinds.MESSAGE_SWITCH_USER_BRUSH:
        this.setState((prevState) => ({
          ...prevState,
          userBrushType: message.userBrushType,
          userBrushColor: message.color
        }));
    }
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

  loadUserCanvas = () => {
    this.setState(
      (prevState) => ({
        ...prevState,
        showUserCanvas: true,
        isLoading: true,
      }),
      () => {
        for (var i = 0; i < 2; i++) {
          setTimeout(() => {
            if (this.refs.userCanvasRef !== null) {
              console.log("Load user canvas");
              this.refs.userCanvasRef.loadData(this.state.userCanvasImageData);
              this.setState(
                (prevState) => ({
                  ...prevState,
                  isLoading: false,
                  disableDrawing: false,
                }),
                () => {
                  this.refs.userCanvasRef.makeBrushColor(
                    this.state.userBrushColor
                  );
                }
              );
            }
          }, 1500);
        }
      }
    );
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

  disableUserCanvas = () => {
    if (this.state.showAICanvas) {
      return;
    }

    // Save the usercanvas data
    var getImageUserCanvas = this.refs.userCanvasRef
      .getBase64()
      .then((usercanvas) => {
        this.setState((prevState) => ({
          ...prevState,
          showAICanvas: false,
          showUserCanvas: false,
          userCanvasImageData: usercanvas,
        }));
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
            // this.refs.userCanvasRef.loadData(this.state.userCanvasImageData);
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
            width: this.state.leftColumnLeftMargin + this.state.leftColumnWidth,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              this.switchToAICanvas();

              sendSwitchBrush(this.state.socket,brushTypes.AI)
            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.AI
                      ? device.height * 0.14
                      : device.height * 0.11,
                  width:
                    this.state.currentBrush == brushTypes.AI
                      ? device.height * 0.14 * 1.8
                      : device.height * 0.11 * 1.8,
                  opacity: this.state.currentBrush == brushTypes.AI ? 1 : 0.55,
                },
              ]}
              source={require("./resources/AIBrush.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              this.switchToStyleBrush();

              sendSwitchBrush(this.state.socket,brushTypes.STYLE)
            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.STYLE
                      ? device.height * 0.14
                      : device.height * 0.11,
                  width:
                    this.state.currentBrush == brushTypes.STYLE
                      ? device.height * 0.14 * 1.8
                      : device.height * 0.11 * 1.8,
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
              sendSwitchBrush(this.state.socket,brushTypes.FILTER)

            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.FILTER
                      ? device.height * 0.14
                      : device.height * 0.11,
                  width:
                    this.state.currentBrush == brushTypes.FILTER
                      ? device.height * 0.14 * 1.8
                      : device.height * 0.11 * 1.8,
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

              sendSwitchBrush(this.state.socket,brushTypes.USER)
            }}
            disabled={this.state.disableButtons}
          >
            <Image
              style={[
                styles.brushes,
                {
                  height:
                    this.state.currentBrush == brushTypes.USER
                      ? device.height * 0.14
                      : device.height * 0.11,
                  width:
                    this.state.currentBrush == brushTypes.USER
                      ? device.height * 0.14 * 1.8
                      : device.height * 0.11 * 1.8,
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
                  sendSwitchUserBrush(this.state.socket,this.state.userBrushType,this.rgbToHex(color))

                }}
              />
              <View
                style={{
                  width: this.state.leftColumnWidth,
                  marginLeft: this.state.leftColumnLeftMargin,
                  marginBottom: 3,
                  margin: "auto",
                }}
              >
                <EyeDropper
                  onPickStart={this.handleOnPickStart}
                  onPickEnd={this.handleOnPickEnd}
                  onChange={this.handleChangeEydropper}
                  customComponent={CustomEyeDropper}
                ></EyeDropper>
              </View>
              {brushSlider}
            </View>
          )}
          {/* Save painting button */}
          <View
            style={{ padding: "1em", marginTop: "10px", marginBottom: "10px" }}
          >
            <Button
              color="#717591"
              title="Save Painting"
              onPress={() => this.saveGeneratedImage()}
            />
          </View>
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
                    width: this.state.USER_CANVASHEIGHT / 4,
                    height: this.state.USER_CANVASHEIGHT / 4,
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
                        width: this.state.USER_CANVASHEIGHT / 4,
                        height: this.state.USER_CANVASHEIGHT / 4,
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
                    width: this.state.USER_CANVASHEIGHT / 4,
                    height: this.state.USER_CANVASHEIGHT / 4,
                    marginRight: 5,
                  },
                ]}
              >
                <Image
                  style={{
                    width: this.state.USER_CANVASHEIGHT / 4,
                    height: this.state.USER_CANVASHEIGHT / 4,
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
                      socket={this.state.socket}
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
              )}

              {/* Show the image for the eye dropper */}
              {this.state.showImageForEyeDropper && (
                <View style={styles.shadowBox}>
                  <Image
                    style={{
                      width: this.state.USER_CANVASWIDTH,
                      height: this.state.USER_CANVASHEIGHT,
                    }}
                    source={this.state.finalImageData}
                  />
                </View>
              )}

              {/* this wraps the buttons at the bottom of canvas */}
              {this.state.currentBrush == brushTypes.AI && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                  }}
                >
                  <View style={{ padding: 5, width: "40%" }}>
                    <Button
                      style={{ marginTop: 10, height: "80" }}
                      color="#5e748a"
                      title="clear"
                      onPress={() => this.clearChildAIBrush()}
                    />
                  </View>

                  <View style={{ padding: 5, width: "40%" }}>
                    <Button
                      mode="contained"
                      style={{ padding: 10 }}
                      onPress={this.grabPixels.bind(this)}
                      color="#88508c"
                      title="generate"
                      disabled={this.state.isLoading}
                    />
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

        {/* this View wraps the right column */}
        <View style={{ flexDirection: "row" }}>
          {/* AI brush palette buttons */}
          {this.state.currentBrush == brushTypes.AI && (
            <View style={styles.brushesContainer}>
              <ScrollView>
                {colorMap.colors.map((obj) => {
                  return (
                    <View style={{ margin: 2 }}>
                      <TouchableOpacity
                        style={{
                          padding: 4,
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
                            fontSize: device.height * 0.025,
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
                        fontSize: 20,
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
                            fontSize: device.height * 0.024,
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
              {/* None filter button */}
              <ScrollView>
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
                      sendSwitchFilter(this.state.socket, "", "None")
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
                        fontSize: 20,
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
                          sendSwitchFilter(this.state.socket, obj.filter, obj.name)
                        }}
                      >
                        <Image style={styles.brushes} source={obj.image_url} />
                        <Text
                          style={{
                            color:
                              this.state.filterBrushType == obj.name
                                ? "white"
                                : "black",
                            fontSize: device.height * 0.024,
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
                        sendSwitchUserBrush(this.state.socket,obj.name,this.state.userBrushColor)
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
    height: device.height * 0.11,
    width: device.height * 0.11 * 1.8,
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
    height: device.height * 0.11,
    width: device.height * 0.11 * 1.8,
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
});

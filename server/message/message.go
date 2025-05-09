package message

const (
	// KindConnected is sent when user connects
	KindConnected = iota + 1
	// KindUserJoined is sent when someone else joins
	KindUserJoined
	// KindUserLeft is sent when someone leaves
	KindUserLeft
	// KindStroke message specifies a stroke drawn by a user
	KindStroke
	// KindClear message is sent when a user clears the screen
	KindClear
	// KindClientInfo message is sent when user initially connects and sends additional connection info
	KindClientInfo
	// KindStrokeStart message is sent when a user starts drawing on their canvas
	KindStrokeStart
	// KindStrokeEnd message is sent when a user ends drawing
	KindStrokeEnd
	// KindGenerate message is sent when a user requests generate from segmentation
	KindGenerate
	// KindStylize message is sent when user requests stylize image
	KindStylize
	// KindSaveGenerated message is sent when user saves their painting (genrated image + user canvas)
	KindSave
	// KindSwitchBrush message is sent when a user selects a different brush (AI, Filter, User brush)
	KindSwitchBrush
	// KindSwitchFilter message is sent when user selects a different filter
	KindSwitchFilter
	// KindSwitchUserBrush message is sent when user selects a new user brush type
	KindSwitchUserBrush
)

type Point struct {
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	CanvasType string  `json:"canvasType"`
}

type User struct {
	ID string `json:"id"`
}

type Connected struct {
	Kind  int    `json:"kind"`
	Users []User `json:"users"`
}

func NewConnected(users []User) *Connected {
	return &Connected{
		Kind:  KindConnected,
		Users: users,
	}
}

type UserJoined struct {
	Kind int  `json:"kind"`
	User User `json:"user"`
}

func NewUserJoined(userID string) *UserJoined {
	return &UserJoined{
		Kind: KindUserJoined,
		User: User{ID: userID},
	}
}

type UserLeft struct {
	Kind   int    `json:"kind"`
	UserID string `json:"userId"`
}

func NewUserLeft(userID string) *UserLeft {
	return &UserLeft{
		Kind:   KindUserLeft,
		UserID: userID,
	}
}

type StrokePoint struct {
	Kind      int     `json:"kind"`
	UserID    string  `json:"userId"`
	Point     Point   `json:"point"`
	Thickness float64 `json:"thickness"`
	Color     string  `json:"color"`
}

type Stroke struct {
	strokes []StrokePoint
}

type Clear struct {
	Kind   int    `json:"kind"`
	UserID string `json:"userId"`
}

type StrokeEnd struct {
	Kind       int     `json:"kind"`
	UserID     string  `json:"userId"`
	Thickness  float64 `json:"thickness"`
	Color      string  `json:"color"`
	CanvasType string  `json:"canvasType"`
}

type StrokeStart struct {
	Kind      int     `json:"kind"`
	UserID    string  `json:"userId"`
	Point     Point   `json:"point"`
	Thickness float64 `json:"thickness"`
	Color     string  `json:"color"`
}

type Generate struct {
	Kind      int    `json:"kind"`
	ImageData string `json:"imageData"`
}

type Stylize struct {
	Kind      int    `json:"kind"`
	ImageData string `json:"imageData"`
	Style     string `json:"style"`
}

type Save struct {
	Kind           int    `json:"kind"`
	SavedImageData string `json:"savedImageData"`
}

type SwitchBrush struct {
	Kind int    `json:"kind"`
	Type string `json:"brushType"`
}

type SwitchFilter struct {
	Kind int    `json:"kind"`
	Type string `json:"filterType"`
	Name string `json:"filterName"`
}

type SwitchUserBrush struct {
	Kind  int    `json:"kind"`
	Type  string `json:"userBrushType"`
	Color string `json:"color"`
}

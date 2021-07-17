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
	// KinddClear message is sent when a user clears the screen
	KindClear
)

type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
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

type Stroke struct {
	Kind   int     `json:"kind"`
	UserID string  `json:"userId"`
	Points []Point `json:"points"`
	Finish bool    `json:"finish"`
}

type Clear struct {
	Kind   int    `json:"kind"`
	UserID string `json:"userId"`
}

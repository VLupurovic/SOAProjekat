package models

import "time"

type Role string

const (
	RoleGuide   Role = "guide"
	RoleTourist Role = "tourist"
	RoleAdmin   Role = "admin"
)

type User struct {
	ID             int64     `json:"id"`
	Username       string    `json:"username"`
	Email          string    `json:"email"`
	PasswordHash   string    `json:"-"`
	Role           Role      `json:"role"`
	FirstName      string    `json:"firstName"`
	LastName       string    `json:"lastName"`
	ProfilePicture string    `json:"profilePicture"`
	Bio            string    `json:"bio"`
	Motto          string    `json:"motto"`
	IsBlocked      bool      `json:"isBlocked"`
	CreatedAt      time.Time `json:"createdAt"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     Role   `json:"role"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type UpdateProfileRequest struct {
	FirstName      string `json:"firstName"`
	LastName       string `json:"lastName"`
	ProfilePicture string `json:"profilePicture"`
	Bio            string `json:"bio"`
	Motto          string `json:"motto"`
}

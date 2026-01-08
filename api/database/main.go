package database

import (
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"log"
)

var DB *gorm.DB

func InitDB() {
	var err error
	path := "../whatsaly_dev.sqlite"

	DB, err = gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB.Exec("PRAGMA journal_mode=WAL;")

	err = DB.AutoMigrate(&Session{}, &UserSettings{})
	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	var count int64
	DB.Model(&Session{}).Count(&count)
	if count == 0 {
		DB.Exec("DELETE FROM sqlite_sequence WHERE name = 'sessions'")
	}
}

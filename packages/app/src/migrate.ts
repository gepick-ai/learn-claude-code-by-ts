import "./env"
import { Database } from "./storage/db"

Database.runMigrations()
Database.close()

console.log("✅ Database migration completed")

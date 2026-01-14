import { ObjectId } from "mongodb";
import { getDatabase } from "../db/mongodb";
import { hashPassword } from "./password";
import type { User, UserDocument } from "./types";

const USERS_COLLECTION = "users";

// Type for user document with string _id (after conversion from MongoDB)
interface UserDocumentWithStringId extends Omit<UserDocument, "_id"> {
  _id: string;
}

/**
 * Create a new user in the database
 */
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const db = await getDatabase();
  const usersCollection = db.collection(USERS_COLLECTION);

  // Check if user already exists
  const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const now = new Date();

  const userDoc = {
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role: "user" as const,
    createdAt: now,
    updatedAt: now,
  };

  const result = await usersCollection.insertOne(userDoc);

  return {
    _id: result.insertedId.toString(),
    email: userDoc.email,
    name: userDoc.name,
    role: userDoc.role,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

/**
 * Find a user by email
 * Returns user with password for authentication
 */
export async function findUserByEmail(email: string): Promise<UserDocumentWithStringId | null> {
  const db = await getDatabase();
  const usersCollection = db.collection(USERS_COLLECTION);

  const user = await usersCollection.findOne({ email: email.toLowerCase() });
  if (!user) return null;

  return {
    _id: user._id.toString(),
    email: user.email as string,
    password: user.password as string,
    name: user.name as string,
    role: user.role as "admin" | "author" | "user",
    createdAt: user.createdAt as Date,
    updatedAt: user.updatedAt as Date,
  };
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const db = await getDatabase();
  const usersCollection = db.collection(USERS_COLLECTION);

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const user = await usersCollection.findOne({ _id: new ObjectId(id) });
  if (!user) return null;

  // Return without password
  return {
    _id: user._id.toString(),
    email: user.email as string,
    name: user.name as string,
    role: user.role as "admin" | "author" | "user",
    createdAt: user.createdAt as Date,
    updatedAt: user.updatedAt as Date,
  };
}

import User from "../models/User.js";
import Post from "../models/Post.js";
import Chat from "../models/Chat.js";
import { handleError } from "../utility/fileutils.js";
import dotenv from 'dotenv';
dotenv.config();

export const getAllUsers = async (req, res) => {
  const { adminPassword } = req.body;
  try {
    if (adminPassword !== "12345")
      return res.status(403).send("Unauthorized: Invalid admin password");
    const users = await User.find();
    res.json(users);
  } catch (err) {
    handleError(res, err);
  }
};
export const deleteAllUsers = async (req, res) => {
  const { adminPassword } = req.body;
  if (adminPassword !== "12345") 
    return res.status(403).send("Invalid admin password");
  try {
    await User.deleteMany({});
    await Post.deleteMany({});
    await Chat.deleteMany({});
    res.status(200).send("All users, posts, and chats deleted successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};
export const deleteUser = async (req, res) => {
  const { username, adminPassword } = req.body;

  try {
    if (adminPassword !== "12345")
      return res.status(403).send("Unauthorized: Invalid admin password");

    const user = await User.findOne({ username });

    if (!user) return res.status(404).send("User not found");

    const chats = await Chat.find({ participants: user._id });

    await User.deleteOne({ _id: user._id });

    for (const chat of chats) {
      const allDeleted = chat.participants.every(participant => participant.toString() !== user._id.toString());
      if (allDeleted) {
        await Chat.deleteOne({ _id: chat._id });
      }
    }

    res.status(200).send("User deleted successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};
export const deleteLargeBuffers = async (req, res) => {
  const { adminPassword, sizeLimitMB } = req.body;
  const sizeLimit = sizeLimitMB * 1024 * 1024;
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(403).send("Unauthorized: Invalid admin password");
  }
  try {
    const posts = await Post.find();
    const largePosts = posts.filter(post => post.image && post.image.length > sizeLimit);
    if (largePosts.length > 0) {
      const postIdsWithLargeImages = largePosts.map(post => post._id);
      await Post.updateMany(
        { _id: { $in: postIdsWithLargeImages } },
        { $unset: { image: "" } }
      );
    }
    const chats = await Chat.find();
    let updatedCount = 0;
    for (const chat of chats) {
      if (chat.messages) {
        const filteredMessages = chat.messages.filter(message => {
          const size = message.file ? message.file.length : 0;
          return size <= sizeLimit;
        });
        if (filteredMessages.length !== chat.messages.length) {
          await Chat.updateOne(
            { _id: chat._id },
            { $set: { messages: filteredMessages } }
          );
          updatedCount++;
        }
      }
    }
    const users = await User.find({ profilePicture: { $exists: true } });
    const usersWithLargePictures = users.filter(user => {
      const size = user.profilePicture ? user.profilePicture.length : 0;
      return size > sizeLimit;
    });
    if (usersWithLargePictures.length > 0) {
      const userIdsWithLargePictures = usersWithLargePictures.map(user => user._id);
      await User.updateMany(
        { _id: { $in: userIdsWithLargePictures } },
        { $unset: { profilePicture: "" } }
      );
    }
    res.status(200).send("All image buffers above the specified limit have been deleted successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};
export const deleteAllPosts = async (req, res) => {
  const { adminPassword } = req.body;
  if (adminPassword !== "12345") 
    return res.status(403).send("Invalid admin password");
  try {
    await Post.deleteMany({});
    res.status(200).send("All posts deleted successfully");
  } catch (err) {
    res.status(400).send(err.message);
  }
};
import express from "express";
import path from "path";
import sharp from "sharp";
import User from "../models/User.js";
import { detectFileType, handleError } from "../utility/fileutils.js";

const router = express.Router({ mergeParams: true });

export const seachUser = async (req, res) => {
  const { usr } = req.query;
  if (!usr) return res.status(400).send("Search term is required");

  const searchCriteria = {
    $or: [
      { username: usr },
      { email: usr },
      { firstName: { $regex: usr, $options: "i" } },
      { lastName: { $regex: usr, $options: "i" } },
    ],
  };

  try {
    const users = await User.find(searchCriteria).select("-password");

    const currentUserBlockedUsers = req.currentUser.blockedUsers || [];

    const accessibleUsers = users.filter((user) => {
      const userBlockedUsers = user.blockedUsers || [];

      const isBlockedByCurrentUser = currentUserBlockedUsers.includes(user._id);
      const hasBlockedCurrentUser = userBlockedUsers.includes(
        req.currentUser._id
      );

      return !isBlockedByCurrentUser && !hasBlockedCurrentUser;
    });

    if (accessibleUsers.length === 0)
      return res.status(404).send("No users found");
    res.json(accessibleUsers);
  } catch (err) {
    handleError(res, err);
  }
};
export const getAllUserSelf = async (req, res) => {
  try {
    const users = await User.find().select(
      "username email firstName lastName age sex bio"
    );

    const currentUserBlockedUsers = req.currentUser.blockedUsers || [];
    const accessibleUsers = users.filter((user) => {
      const userBlockedUsers = user.blockedUsers || [];
      const isBlockedByCurrentUser = currentUserBlockedUsers.includes(user._id);
      const hasBlockedCurrentUser = userBlockedUsers.includes(
        req.currentUser._id
      );

      return !isBlockedByCurrentUser && !hasBlockedCurrentUser;
    });

    res.json(accessibleUsers);
  } catch (err) {
    handleError(res, err);
  }
};
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    const allowedExtensions = /jpeg|jpg|png|gif/;
    const extname = allowedExtensions.test(path.extname(req.file.originalname).toLowerCase());
    const mimetype = allowedExtensions.test(req.file.mimetype);
    if (!extname || !mimetype) return res.status(400).send("Only image files are allowed!");
    let compressedImage;
    if (req.file.mimetype === 'image/gif') {
      compressedImage = req.file.buffer;
    } else {
      compressedImage = await sharp(req.file.buffer)
        .resize({ width: 1080, height: 1080, fit: sharp.fit.cover })
        .toFormat(mimetype === 'image/png' ? 'png' : 'jpeg', { quality: 75 })
        .toBuffer();
    }
    req.currentUser.profilePicture = compressedImage;
    await req.currentUser.save();
    res.status(200).send("Profile picture updated successfully");
  } catch (err) {
    res.status(500).send("Error updating profile picture");
  }
};
export const deleteProfilePicture = async (req, res) => {
  try {
    if (!req.currentUser.profilePicture)
      return res.status(404).send("No profile picture to delete");

    req.currentUser.profilePicture = undefined;
    await req.currentUser.save();

    res.status(200).send("Profile picture deleted successfully");
  } catch (err) {
    handleError(res, err);
  }
};
export const getProfilePictore = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      "profilePicture blockedUsers"
    );
    if (
      req.currentUser.blockedUsers.includes(user._id) ||
      user.blockedUsers.includes(req.currentUser._id)
    ) {
      return res.status(403).send("Access denied");
    }
    if (!user || !user.profilePicture)
      return res.status(404).send("Profile picture not found");
    const mimeType = await detectFileType(user.profilePicture);
    res.set("Content-Type", mimeType);
    res.send(user.profilePicture);
  } catch (err) {
    handleError(res, err);
  }
};
export const sendRequest = async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username });
    if (!targetUser) return res.status(404).send("User not found");
    if (targetUser._id.equals(req.currentUser._id))
      return res.status(400).send("You cannot connect with yourself");
    if (
      req.currentUser.blockedUsers.includes(targetUser._id) ||
      targetUser.blockedUsers.includes(req.currentUser._id)
    ) {
      return res.status(403).send("Cannot connect with this user");
    }
    if (targetUser.connections.includes(req.currentUser._id))
      return res.status(400).send("Already connected");
    if (targetUser.connectionRequests.includes(req.currentUser._id))
      return res.status(400).send("Connection request already sent");
    targetUser.connectionRequests.push(req.currentUser._id);
    await targetUser.save();
    res.status(200).send("Connection request sent");
  } catch (err) {
    handleError(res, err);
  }
};
export const acceptRequest = async (req, res) => {
  try {
    const requesterUser = await User.findOne({ username: req.params.username });
    if (!requesterUser) return res.status(404).send("User not found");
    if (!req.currentUser.connectionRequests.includes(requesterUser._id))
      return res.status(400).send("No connection request from this user");
    req.currentUser.connectionRequests.pull(requesterUser._id);
    req.currentUser.connections.push(requesterUser._id);
    requesterUser.connections.push(req.currentUser._id);
    await req.currentUser.save();
    await requesterUser.save();
    res.send("Connection accepted");
  } catch (err) {
    handleError(res, err);
  }
};
export const viewRequests = async (req, res) => {
  try {
    const user = await User.findById(req.currentUser._id).populate(
      "connectionRequests",
      "username"
    );
    if (!user) return res.status(404).send("User not found");
    res.status(200).json(user.connectionRequests);
  } catch (err) {
    handleError(res, err);
  }
};
export const viewConnections = async (req, res) => {
  try {
    const user = await User.findById(req.currentUser._id).populate(
      "connections",
      "username"
    );
    if (!user) return res.status(404).send("User not found");
    res.status(200).json(user.connections);
  } catch (err) {
    handleError(res, err);
  }
};
export const unsendRequest = async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username });
    if (!targetUser) return res.status(404).send("User not found");

    if (targetUser._id.equals(req.currentUser._id))
      return res.status(400).send("Bad Request");

    if (!targetUser.connectionRequests.includes(req.currentUser._id))
      return res.status(400).send("No connection request to unsend");

    targetUser.connectionRequests.pull(req.currentUser._id);
    await targetUser.save();

    res.send("Connection request unsent");
  } catch (err) {
    handleError(res, err);
  }
};
export const deleteRequest = async (req, res) => {
  try {
    const requesterUser = await User.findOne({ username: req.params.username });
    if (!requesterUser) return res.status(404).send("User not found");

    if (requesterUser._id.equals(req.currentUser._id))
      return res.status(400).send("Bad Request");

    if (!req.currentUser.connectionRequests.includes(requesterUser._id))
      return res.status(400).send("No connection request from this user");

    req.currentUser.connectionRequests.pull(requesterUser._id);
    await req.currentUser.save();

    res.send("Connection request deleted");
  } catch (err) {
    handleError(res, err);
  }
};
export const removeConnection = async (req, res) => {
  try {
    const connectedUser = await User.findOne({ username: req.params.username });
    if (!connectedUser) return res.status(404).send("User not found");

    // Check if the users are connected
    if (!req.currentUser.connections.includes(connectedUser._id))
      return res.status(400).send("No connection exists with this user");

    // Remove each other from connections list
    req.currentUser.connections.pull(connectedUser._id);
    connectedUser.connections.pull(req.currentUser._id);

    await req.currentUser.save();
    await connectedUser.save();

    res.send("Connection removed");
  } catch (err) {
    handleError(res, err);
  }
};
export const blockUser = async (req, res) => {
  try {
    const userToBlock = await User.findOne({ username: req.params.username });
    if (!userToBlock) return res.status(404).send("User not found");
    if (req.currentUser._id.equals(userToBlock._id))
      return res.status(400).send("You cannot block yourself");

    if (!req.currentUser.blockedUsers.includes(userToBlock._id)) {
      req.currentUser.blockedUsers.push(userToBlock._id);

      req.currentUser.connections.pull(userToBlock._id);
      req.currentUser.connectionRequests.pull(userToBlock._id);

      await req.currentUser.save();
      return res.status(200).send("User blocked");
    }
    return res.status(400).send("User already blocked");
  } catch (err) {
    handleError(res, err);
  }
};
export const unblockUser = async (req, res) => {
  try {
    const userToUnblock = await User.findOne({ username: req.params.username });
    if (!userToUnblock) return res.status(404).send("User not found");
    if (req.currentUser._id.equals(userToUnblock._id))
      return res.status(400).send("It's you!");
    if (req.currentUser.blockedUsers.includes(userToUnblock._id)) {
      req.currentUser.blockedUsers.pull(userToUnblock._id);
      await req.currentUser.save();
      return res.status(200).send("User unblocked");
    }
    return res.status(400).send("User is not blocked");
  } catch (err) {
    handleError(res, err);
  }
};
export const viewBlockList = async (req, res) => {
  try {
    const blockedUsers = await User.find({
      _id: { $in: req.currentUser.blockedUsers },
    }).select("username email firstName lastName");

    if (blockedUsers.length === 0) {
      return res.status(404).send("No blocked users found");
    }
    res.status(200).json(blockedUsers);
  } catch (err) {
    handleError(res, err);
  }
};
export const getAllNonBlockedUsers = async (req, res) => {
  try {
    const users = await User.find().select("firstName profilePicture _id blockedUsers");
    const currentUserBlockedUsers = req.currentUser.blockedUsers || [];
    const resizeImage = (buffer) => {
      if (!buffer) return null;
      const base64Image = buffer.toString('base64');
      return `data:image/jpeg;base64,${base64Image}`;
    };
    const accessibleUsers = users.filter(user => {
      const userBlockedUsers = user.blockedUsers || [];
      const isBlockedByCurrentUser = currentUserBlockedUsers.includes(user._id);
      const hasBlockedCurrentUser = userBlockedUsers.includes(req.currentUser._id);
      return !isBlockedByCurrentUser && !hasBlockedCurrentUser;
    }).map(user => ({
      _id: user._id,
      firstName: user.firstName,
      profilePicture: resizeImage(user.profilePicture),
    }));
    res.json(accessibleUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.currentUser._id;
    const user = await User.findById(userId).select("firstName lastName profilePicture username sex bio blockedUsers createdAt connections connectionRequests");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isBlockedByCurrentUser = req.currentUser.blockedUsers.includes(userId);
    const hasBlockedCurrentUser = user.blockedUsers.includes(currentUserId);
    if (isBlockedByCurrentUser || hasBlockedCurrentUser) {
      return res.status(403).json({ message: "Access denied" });
    }
    const isConnected = user.connections.includes(currentUserId);
    const hasRequested = user.connectionRequests.includes(currentUserId);
    const resizeImage = (buffer) => {
      if (!buffer) return null;
      const base64Image = buffer.toString('base64');
      return `data:image/jpeg;base64,${base64Image}`;
    };
    res.json({
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      sex: user.sex,
      bio: user.bio,
      joined: user.createdAt,
      profilePicture: resizeImage(user.profilePicture),
      isConnected: isConnected,
      isBlocked: hasBlockedCurrentUser,
      hasRequested: hasRequested,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default router;

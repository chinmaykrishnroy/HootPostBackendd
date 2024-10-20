// import express from 'express';
// import path from 'path';
// import sharp from 'sharp';
// import User from '../models/User.js';
// import { auth } from '../middleware/auth.js';
// import upload from '../middleware/upload.js';
// import { detectFileType, handleError } from '../utility/fileutils.js';
// import { getCurrentUser } from '../middleware/getcurrentuser.js';

// const router = express.Router({ mergeParams: true });

// // Centralized function to fetch user by username
// const getUserByUsername = async (req, res, next) => {
//     try {
//         const user = await User.findOne({ username: req.params.username });
//         if (!user) return res.status(404).send('User not found');
//         req.targetUser = user; // Attach user to the request object
//         next();
//     } catch (err) {
//         handleError(res, err);
//     }
// };

// // Centralized function to filter accessible users
// const filterAccessibleUsers = (users, currentUser) => {
//     return users.filter(user => 
//         !currentUser.blockedUsers.includes(user._id) &&
//         !user.blockedUsers.includes(currentUser._id)
//     );
// };

// // Centralized error handler
// const asyncHandler = fn => (req, res, next) => {
//     Promise.resolve(fn(req, res, next)).catch(next);
// };

// // Search User Profile
// router.get('/search', [auth, getCurrentUser], asyncHandler(async (req, res) => {
//     const { usr } = req.query;
//     if (!usr) return res.status(400).send('Search term is required');

//     const users = await User.find({
//         $or: [
//             { username: usr },
//             { email: usr },
//             { firstName: { $regex: usr, $options: 'i' } },
//             { lastName: { $regex: usr, $options: 'i' } }
//         ]
//     }).select('-password -blockedUsers');

//     const accessibleUsers = filterAccessibleUsers(users, req.currentUser);
//     if (accessibleUsers.length === 0) return res.status(404).send('No users found');
//     res.json(accessibleUsers);
// }));

// // Get All User Profiles
// router.get('/', [auth, getCurrentUser], asyncHandler(async (req, res) => {
//     const users = await User.find().select('-password -blockedUsers');
//     const accessibleUsers = filterAccessibleUsers(users, req.currentUser);
//     res.json(accessibleUsers);
// }));

// // Utility functions for blocking and unblocking users
// const blockUser = async (currentUser, targetUser) => {
//     if (!currentUser.blockedUsers.includes(targetUser._id)) {
//         currentUser.blockedUsers.push(targetUser._id);
//         currentUser.connections.pull(targetUser._id);
//         currentUser.connectionRequests.pull(targetUser._id);
//         await currentUser.save();
//     }
// };

// const unblockUser = async (currentUser, targetUser) => {
//     currentUser.blockedUsers.pull(targetUser._id);
//     await currentUser.save();
// };

// // Upload or Update Profile Picture Route
// router.post('/uploadProfilePicture', [auth, getCurrentUser, upload.single('profilePicture')], asyncHandler(async (req, res) => {
//     if (!req.file) return res.status(400).send('No file uploaded');

//     const allowedExtensions = /jpeg|jpg|png|gif/;
//     const extname = allowedExtensions.test(path.extname(req.file.originalname).toLowerCase());
//     const mimetype = allowedExtensions.test(req.file.mimetype);

//     if (!extname || !mimetype) return res.status(400).send('Only image files are allowed!');

//     const compressedImage = await sharp(req.file.buffer).jpeg({ quality: 75 }).toBuffer();
//     req.currentUser.profilePicture = compressedImage;
//     await req.currentUser.save();

//     res.status(200).send('Profile picture updated successfully');
// }));

// // Delete Profile Picture Route
// router.delete('/deleteProfilePicture', [auth, getCurrentUser], asyncHandler(async (req, res) => {
//     if (!req.currentUser.profilePicture) return res.status(404).send('No profile picture to delete');

//     req.currentUser.profilePicture = undefined;
//     await req.currentUser.save();

//     res.status(200).send('Profile picture deleted successfully');
// }));

// // Get Profile Picture by username
// router.get('/:username/profilePicture', [auth, getCurrentUser, getUserByUsername], asyncHandler(async (req, res) => {
//     const user = req.targetUser;
//     if (!user.profilePicture) return res.status(404).send('Profile picture not found');

//     if (req.currentUser.blockedUsers.includes(user._id) || user.blockedUsers.includes(req.currentUser._id)) {
//         return res.status(403).send('Access denied');
//     }

//     const mimeType = await detectFileType(user.profilePicture);
//     res.set('Content-Type', mimeType);
//     res.send(user.profilePicture);
// }));

// // Send Connect Request
// router.post('/connect/:username', [auth, getCurrentUser, getUserByUsername], asyncHandler(async (req, res) => {
//     const targetUser = req.targetUser;
//     if (targetUser._id.equals(req.currentUser._id)) return res.status(400).send('You cannot connect with yourself');

//     if (req.currentUser.blockedUsers.includes(targetUser._id) || targetUser.blockedUsers.includes(req.currentUser._id)) {
//         return res.status(403).send('Cannot connect with this user');
//     }

//     if (targetUser.connections.includes(req.currentUser._id)) return res.status(400).send('Already connected');
//     if (targetUser.connectionRequests.includes(req.currentUser._id)) return res.status(400).send('Connection request already sent');

//     targetUser.connectionRequests.push(req.currentUser._id);
//     await targetUser.save();

//     res.send('Connection request sent');
// }));

// // Accept Connection
// router.post('/accept-connection/:username', [auth, getCurrentUser, getUserByUsername], asyncHandler(async (req, res) => {
//     const requesterUser = req.targetUser;

//     if (!req.currentUser.connectionRequests.includes(requesterUser._id)) return res.status(400).send('No connection request from this user');

//     req.currentUser.connectionRequests.pull(requesterUser._id);
//     req.currentUser.connections.push(requesterUser._id);
//     requesterUser.connections.push(req.currentUser._id);

//     await req.currentUser.save();
//     await requesterUser.save();

//     res.send('Connection accepted');
// }));

// // View Connection Requests
// router.get('/requests', [auth, getCurrentUser], asyncHandler(async (req, res) => {
//     const user = await User.findById(req.currentUser._id).populate('connectionRequests', 'username');
//     if (!user) return res.status(404).send('User not found');
//     res.status(200).json(user.connectionRequests);
// }));

// // View Connections
// router.get('/connections', [auth, getCurrentUser], asyncHandler(async (req, res) => {
//     const user = await User.findById(req.currentUser._id).populate('connections', 'username');
//     if (!user) return res.status(404).send('User not found');
//     res.status(200).json(user.connections);
// }));

// // Unsend Connection Request
// router.delete('/unsend-request/:username', [auth, getCurrentUser, getUserByUsername], asyncHandler(async (req, res) => {
//     const targetUser = req.targetUser;

//     if (targetUser._id.equals(req.currentUser._id)) return res.status(400).send('Bad Request');

//     if (!targetUser.connectionRequests.includes(req.currentUser._id)) return res.status(400).send('No connection request to unsend');

//     targetUser.connectionRequests.pull(req.currentUser._id);
//     await targetUser.save();

//     res.send('Connection request unsent');
// }));

// // Delete Connection Request
// router.delete('/delete-request/:username', [auth, getCurrentUser, getUserByUsername], asyncHandler(async (req, res) => {
//     const requesterUser = req.targetUser;

//     if (requesterUser._id.equals(req.currentUser._id)) return res.status(400).send('Bad Request');

//     if (!req.currentUser.connectionRequests.includes(requesterUser._id)) return res.status(400).send('No connection request from this user');

//     req.currentUser.connectionRequests.pull(requesterUser._id);
//     await req.currentUser.save();

//     res.send('Connection request deleted');
// }));

// // Remove Connection
// router.delete('/disconnect/:username', [auth, getCurrentUser, getUserByUsername], asyncHandler(async (req, res) => {
//     const connectedUser = req.targetUser;

//     if (!req.currentUser.connections.includes(connectedUser._id)) return res.status(400).send('No connection exists with this user');

//     req.currentUser.connections.pull(connectedUser._id);
//     connectedUser.connections.pull(req.currentUser._id);

//     await req.currentUser.save();
//     await connectedUser.save();

//     res.send('Connection removed');
// }));

// // Block User by Username
// router.post('/block/:username', [auth, getCurrentUser, getUserByUsername], asyncHandler(async (req, res) => {
//     const userToBlock = req.targetUser;

//     if (req.currentUser._id.equals(userToBlock._id)) return res.status(400).send('You cannot block yourself');

//     await blockUser(req.currentUser, userToBlock);
//     res.status(200).send('User blocked');
// }));

// // Unblock User by username
// router.post('/unblock/:username', [auth, getCurrentUser, getUserByUsername], asyncHandler(async (req, res) => {
//     const userToUnblock = req.targetUser;

//     await unblockUser(req.currentUser, userToUnblock);
//     res.status(200).send('User unblocked');
// }));

// export default router;



// // OLD ROUTES/USER.JS
// import express from 'express';
// import path from 'path';
// import sharp from 'sharp';
// import User from '../models/User.js';
// import { auth } from '../middleware/auth.js';
// import upload from '../middleware/upload.js';
// import { detectFileType, handleError } from '../utility/fileutils.js';
// import { getCurrentUser } from '../middleware/getcurrentuser.js';

// const router = express.Router({ mergeParams: true });

// // Search User Profile
// router.get('/search', [auth, getCurrentUser], async (req, res) => {
//     const { usr } = req.query;
//     if (!usr) return res.status(400).send('Search term is required');

//     try {
//         const users = await User.find({
//             $or: [
//                 { username: usr },
//                 { email: usr },
//                 { firstName: { $regex: usr, $options: 'i' } },
//                 { lastName: { $regex: usr, $options: 'i' } }
//             ]
//         }).select('-password -blockedUsers');

//         const accessibleUsers = users.filter(user => 
//             !req.currentUser.blockedUsers.includes(user._id) && 
//             !user.blockedUsers.includes(req.currentUser._id)
//         );

//         if (accessibleUsers.length === 0) return res.status(404).send('No users found');
//         res.json(accessibleUsers);
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Get All User Profiles
// router.get('/', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const users = await User.find().select('-password -blockedUsers');
//         const accessibleUsers = users.filter(user => 
//             !req.currentUser.blockedUsers.includes(user._id) && 
//             !user.blockedUsers.includes(req.currentUser._id)
//         );
//         res.json(accessibleUsers);
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Upload or Update Profile Picture Route
// router.post('/uploadProfilePicture', [auth, getCurrentUser, upload.single('profilePicture')], async (req, res) => {
//     try {
//         if (!req.file) return res.status(400).send('No file uploaded');

//         const allowedExtensions = /jpeg|jpg|png|gif/;
//         const extname = allowedExtensions.test(path.extname(req.file.originalname).toLowerCase());
//         const mimetype = allowedExtensions.test(req.file.mimetype);

//         if (!extname || !mimetype) return res.status(400).send('Only image files are allowed!');

//         const compressedImage = await sharp(req.file.buffer).jpeg({ quality: 75 }).toBuffer();
//         req.currentUser.profilePicture = compressedImage;
//         await req.currentUser.save();

//         res.status(200).send('Profile picture updated successfully');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Delete Profile Picture Route
// router.delete('/deleteProfilePicture', [auth, getCurrentUser], async (req, res) => {
//     try {
//         // Check if the current user has a profile picture
//         if (!req.currentUser.profilePicture) return res.status(404).send('No profile picture to delete');

//         req.currentUser.profilePicture = undefined;
//         await req.currentUser.save();

//         res.status(200).send('Profile picture deleted successfully');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Get Profile Picture by username
// router.get('/:username/profilePicture', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const user = await User.findOne({ username: req.params.username }).select('profilePicture blockedUsers');
//         if (!user || !user.profilePicture) return res.status(404).send('Profile picture not found');
        
//         if (req.currentUser.blockedUsers.includes(user._id) || user.blockedUsers.includes(req.currentUser._id)) {
//             return res.status(403).send('Access denied');
//         }

//         const mimeType = await detectFileType(user.profilePicture);
//         res.set('Content-Type', mimeType);
//         res.send(user.profilePicture);
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Send Connect Request
// router.post('/connect/:username', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const targetUser = await User.findOne({ username: req.params.username });
//         if (!targetUser) return res.status(404).send('User not found');

//         if (targetUser._id.equals(req.currentUser._id)) return res.status(400).send('You cannot connect with yourself');

//         if (req.currentUser.blockedUsers.includes(targetUser._id) || targetUser.blockedUsers.includes(req.currentUser._id)) {
//             return res.status(403).send('Cannot connect with this user');
//         }

//         if (targetUser.connections.includes(req.currentUser._id)) return res.status(400).send('Already connected');
//         if (targetUser.connectionRequests.includes(req.currentUser._id)) return res.status(400).send('Connection request already sent');

//         targetUser.connectionRequests.push(req.currentUser._id);
//         await targetUser.save();

//         res.send('Connection request sent');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Accept Connection
// router.post('/accept-connection/:username', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const requesterUser = await User.findOne({ username: req.params.username });
//         if (!requesterUser) return res.status(404).send('User not found');

//         if (!req.currentUser.connectionRequests.includes(requesterUser._id)) return res.status(400).send('No connection request from this user');

//         req.currentUser.connectionRequests.pull(requesterUser._id);
//         req.currentUser.connections.push(requesterUser._id);
//         requesterUser.connections.push(req.currentUser._id);

//         await req.currentUser.save();
//         await requesterUser.save();

//         res.send('Connection accepted');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // View Connection Requests
// router.get('/requests', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const user = await User.findById(req.currentUser._id).populate('connectionRequests', 'username');
//         if (!user) return res.status(404).send('User not found');
//         res.status(200).json(user.connectionRequests);
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // View Connections
// router.get('/connections', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const user = await User.findById(req.currentUser._id).populate('connections', 'username');
//         if (!user) return res.status(404).send('User not found');
//         res.status(200).json(user.connections);
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Unsend Connection Request
// router.delete('/unsend-request/:username', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const targetUser = await User.findOne({ username: req.params.username });
//         if (!targetUser) return res.status(404).send('User not found');

//         if (targetUser._id.equals(req.currentUser._id)) return res.status(400).send('Bad Request');

//         if (!targetUser.connectionRequests.includes(req.currentUser._id)) return res.status(400).send('No connection request to unsend');

//         targetUser.connectionRequests.pull(req.currentUser._id);
//         await targetUser.save();

//         res.send('Connection request unsent');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Delete Connection Request
// router.delete('/delete-request/:username', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const requesterUser = await User.findOne({ username: req.params.username });
//         if (!requesterUser) return res.status(404).send('User not found');

//         if (requesterUser._id.equals(req.currentUser._id)) return res.status(400).send('Bad Request');

//         if (!req.currentUser.connectionRequests.includes(requesterUser._id)) return res.status(400).send('No connection request from this user');

//         req.currentUser.connectionRequests.pull(requesterUser._id);
//         await req.currentUser.save();

//         res.send('Connection request deleted');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Remove Connection
// router.delete('/disconnect/:username', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const connectedUser = await User.findOne({ username: req.params.username });
//         if (!connectedUser) return res.status(404).send('User not found');

//         // Check if the users are connected
//         if (!req.currentUser.connections.includes(connectedUser._id)) return res.status(400).send('No connection exists with this user');

//         // Remove each other from connections list
//         req.currentUser.connections.pull(connectedUser._id);
//         connectedUser.connections.pull(req.currentUser._id);

//         await req.currentUser.save();
//         await connectedUser.save();

//         res.send('Connection removed');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Block User by Username
// router.post('/block/:username', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const userToBlock = await User.findOne({ username: req.params.username });
//         if (!userToBlock) return res.status(404).send('User not found');
//         if (req.currentUser._id.equals(userToBlock._id)) return res.status(400).send('You cannot block yourself');

//         if (!req.currentUser.blockedUsers.includes(userToBlock._id)) {
//             req.currentUser.blockedUsers.push(userToBlock._id);

//             req.currentUser.connections.pull(userToBlock._id);
//             req.currentUser.connectionRequests.pull(userToBlock._id);

//             await req.currentUser.save();
//             return res.status(200).send('User blocked');
//         }
//         return res.status(400).send('User already blocked');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// // Unblock User by username
// router.post('/unblock/:username', [auth, getCurrentUser], async (req, res) => {
//     try {
//         const userToUnblock = await User.findOne({ username: req.params.username });
//         if (!userToUnblock) return res.status(404).send('User not found');

//         if (req.currentUser.blockedUsers.includes(userToUnblock._id)) {
//             req.currentUser.blockedUsers.pull(userToUnblock._id);
//             await req.currentUser.save();
//             return res.status(200).send('User unblocked');
//         }
//         return res.status(400).send('User is not blocked');
//     } catch (err) {
//         handleError(res, err);
//     }
// });

// export default router;

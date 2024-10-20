import express from 'express';
import { auth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { getCurrentUser } from '../middleware/getcurrentuser.js';
import {seachUser, getAllUserSelf, uploadProfilePicture, deleteProfilePicture, getProfilePictore, sendRequest,
    acceptRequest, viewRequests, viewConnections, unsendRequest, deleteRequest, removeConnection, blockUser, getUserById,
    unblockUser, viewBlockList, getAllNonBlockedUsers} from '../controllers/user.js';

const router = express.Router({ mergeParams: true });

router.get('/search', [auth, getCurrentUser], seachUser);
router.get('/', [auth, getCurrentUser], getAllUserSelf);
router.post('/uploadProfilePicture', [auth, getCurrentUser, upload.single('profilePicture')], uploadProfilePicture);
router.delete('/deleteProfilePicture', [auth, getCurrentUser], deleteProfilePicture);
router.get('/:username/profilePicture', [auth, getCurrentUser], getProfilePictore);
router.post('/connect/:username', [auth, getCurrentUser], sendRequest);
router.post('/accept-connection/:username', [auth, getCurrentUser], acceptRequest);
router.get('/requests', [auth, getCurrentUser], viewRequests);
router.get('/connections', [auth, getCurrentUser], viewConnections);
router.delete('/unsend-request/:username', [auth, getCurrentUser], unsendRequest);
router.delete('/delete-request/:username', [auth, getCurrentUser], deleteRequest);
router.delete('/disconnect/:username', [auth, getCurrentUser], removeConnection);
router.post('/block/:username', [auth, getCurrentUser], blockUser);
router.post('/unblock/:username', [auth, getCurrentUser], unblockUser);
router.get('/blocked', [auth, getCurrentUser], viewBlockList);
router.get('/all', [auth, getCurrentUser], getAllNonBlockedUsers);
router.get('/:userId/load', [auth, getCurrentUser], getUserById);

export default router;

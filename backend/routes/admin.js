import express from 'express';
import {getAllUsers, deleteAllUsers, deleteUser, deleteLargeBuffers} from '../controllers/admin.js';

const router = express.Router();

router.post('/view-all', getAllUsers);
router.delete('/delete-all', deleteAllUsers);
router.delete('/deleteuser', deleteUser);
router.delete('/delete-large-buffers', deleteLargeBuffers);
export default router;
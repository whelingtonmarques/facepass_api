import { Router } from 'express'
import multer from 'multer'
import { verify, register } from '../controllers/face.controller'

const router = Router()
const upload = multer({ dest: 'uploads/' })

// Rota para cadastro de usuário com imagem facial
router.post('/register', upload.single('photo'), register)

// Rota para validação facial (com ou sem userId)
router.post('/verify', upload.single('photo'), verify)

export default router
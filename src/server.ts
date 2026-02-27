import express from 'express'
import { loadModels } from './ml/face.loader'
import faceRoutes from './routes/face.routes'
import { userRepository } from './repositories/user.repository'

const app = express()
app.use(express.json())
app.use('/face', faceRoutes)

loadModels().then(async () => {
    await userRepository.warmUp()
    app.listen(3000, () => {
        console.log('Servidor rodando na porta 3000')
    })
})
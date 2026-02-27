import { canvas, faceapi } from '../ml/face.loader';
import { userRepository } from '../repositories/user.repository';
import { IUser } from '../types/user.type';

interface VerifyResult {
    access: boolean
    mode?: '1:1' | '1:N'
    userName?: string
    message?: string
}

interface RegisterResult {
    success: boolean
    userId?: string
    message?: string
}

// Limite de distância para considerar uma correspondência
const threshold = 0.6

let faceMatcher: faceapi.FaceMatcher | null = null

export function invalidateMatcher() { faceMatcher = null }

// Obtém o FaceMatcher do cache ou reconstrói se necessário
async function getOrBuildMatcher(): Promise<faceapi.FaceMatcher> {
    if (faceMatcher) return faceMatcher

    // Carrega todos os usuários e seus descritores para construir o FaceMatcher
    const users = await userRepository.findAll()
    // Constrói o FaceMatcher com os descritores dos usuários
    const labeled = users.map(u =>
        new faceapi.LabeledFaceDescriptors(u.userId, [new Float32Array(u.descriptor)])
    )
    // Cria o FaceMatcher com os descritores rotulados e o limite de distância
    faceMatcher = new faceapi.FaceMatcher(labeled, threshold)

    return faceMatcher
}

// Verifica se a imagem do rosto corresponde ao usuário ou a qualquer usuário registrado
async function generateDescriptor(imagePath: string): Promise<Float32Array | null> {
    // Carrega a imagem usando canvas
    const img = await canvas.loadImage(imagePath)

    // Detecta o rosto na imagem e gera o descritor facial
    const detection = await faceapi
        .detectSingleFace(img as any)
        .withFaceLandmarks()
        .withFaceDescriptor()

    return detection?.descriptor ?? null
}

// Verifica o rosto usando uma abordagem híbrida (1:1 e 1:N)
export async function verifyHybrid(userId: string | undefined, imagePath: string): Promise<VerifyResult> {

    // Gera o descritor facial a partir da imagem de entrada
    const inputDescriptor = await generateDescriptor(imagePath)
    if (!inputDescriptor) return { access: false, message: 'Nenhum rosto detectado na imagem.' }

    // Verificação 1:1
    if (userId) {
        // Busca o usuário pelo ID
        const user = await userRepository.findById(userId)
        if (!user) return { access: false, message: 'Usuário não encontrado.' }

        // Calcula a distância euclidiana entre o descritor de entrada e o descritor do usuário
        const distance = faceapi.euclideanDistance(inputDescriptor, new Float32Array(user.descriptor))

        // Se a distância for menor que o limite, consideramos uma correspondência válida
        if (distance < threshold) {
            return { access: true, mode: '1:1', userName: user.name }
        } else {
            // Se não houver correspondência 1:1, retorna erro imediatamente
            return { access: false, message: 'Rosto não corresponde ao usuário informado.' }
        }
    }

    // Verificação 1:N usando FaceMatcher com cache
    // Obtém o FaceMatcher do cache ou reconstrói se necessário
    const matcher = await getOrBuildMatcher()
    // Encontra a melhor correspondência para o descritor de entrada
    const match = matcher.findBestMatch(inputDescriptor)

    // Se a correspondência não for "unknown", significa que encontramos um usuário correspondente
    if (match.label !== 'unknown') {
        const user = await userRepository.findById(match.label)
        return { access: true, mode: '1:N', userName: user?.name }
    }

    return { access: false, message: 'Não reconhecido.' }
}

// Registra um novo usuário com sua imagem facial
export async function registerUser(userId: string, name: string, imagePath: string): Promise<RegisterResult> {
    // Verifica se o usuário já existe
    const existingUser = await userRepository.findById(userId)
    if (existingUser) {
        return { success: false, message: 'Usuário já cadastrado.' }
    }

    // Gera o descritor facial a partir da imagem
    const descriptor = await generateDescriptor(imagePath)
    if (!descriptor) {
        return { success: false, message: 'Nenhum rosto detectado na imagem.' }
    }

    // Cria e salva o usuário
    const user: IUser = {
        userId,
        name,
        imagePath,
        descriptor: Array.from(descriptor)
    }

    await userRepository.save(user)

    // Invalida o cache do FaceMatcher para garantir que o novo usuário seja considerado nas próximas verificações
    invalidateMatcher()

    return { success: true, userId, message: 'Usuário cadastrado com sucesso.' }
}
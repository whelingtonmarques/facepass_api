import fs from 'fs'
import path from 'path'
import { IUser } from '../types/user.type'

export class UserRepository {
    private basePath = path.resolve('storage/users')
    private cache = new Map<string, IUser>()
    private cacheLoaded = false

    constructor() {
        // Garante que o diretório de armazenamento exista
        if (!fs.existsSync(this.basePath))
            fs.mkdirSync(this.basePath, { recursive: true })
    }

    // Método para aquecer o cache na inicialização, carregando todos os usuários em memória
    async warmUp(): Promise<void> {
        const files = fs.readdirSync(this.basePath)
        for (const file of files) {
            const content = fs.readFileSync(path.join(this.basePath, file), 'utf-8')
            const user: IUser = JSON.parse(content)
            this.cache.set(user.userId, user)
        }
        this.cacheLoaded = true
        console.log(`Cache aquecido com ${this.cache.size} usuários.`)
    }

    // Salva um usuário localmente, armazenando seus dados em um arquivo JSON
    async save(user: IUser): Promise<void> {
        const filePath = path.join(this.basePath, `${user.userId}.json`)
        await fs.promises.writeFile(filePath, JSON.stringify(user))
        this.cache.set(user.userId, user)
    }

    // Encontra um usuário pelo ID, usando cache quando disponível
    async findById(userId: string): Promise<IUser | null> {
        console.time('findById');

        if (this.cache.has(userId)) {
            console.timeEnd('findById');
            return this.cache.get(userId)!
        }

        const filePath = path.join(this.basePath, `${userId}.json`)
        if (!fs.existsSync(filePath)) {
            console.timeEnd('findById');
            return null
        }

        const content = fs.readFileSync(filePath, 'utf-8')
        const user: IUser = JSON.parse(content)
        this.cache.set(userId, user)

        console.timeEnd('findById');
        return user
    }

    // Recupera todos os usuários armazenados, usando cache quando disponível
    async findAll(): Promise<IUser[]> {
        if (this.cacheLoaded) {
            return Array.from(this.cache.values())
        }

        const files = fs.readdirSync(this.basePath)
        const users: IUser[] = []

        for (const file of files) {
            const content = fs.readFileSync(path.join(this.basePath, file), 'utf-8')
            const user: IUser = JSON.parse(content)
            this.cache.set(user.userId, user)
            users.push(user)
        }

        this.cacheLoaded = true
        return users
    }
}

// Instância singleton compartilhada
export const userRepository = new UserRepository()
import { Request, Response } from 'express'
import fs from 'fs'
import { registerUser, verifyHybrid } from '../services/face.service'

// Função utilitária simples para logar informações
function logRequestInfo(req: Request, extra?: Record<string, any>) {
    const { method, originalUrl, body, params, query } = req;
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl}`);
    console.log('Body:', body);
    console.log('Params:', params);
    console.log('Query:', query);
    if (extra) console.log('Extra:', extra);
}

// Rota para cadastro de usuário com imagem facial
export async function register(req: Request, res: Response) {
    const { userId, name } = req.body;
    const filesInput = req.files as Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined;
    const files = Array.isArray(filesInput)
        ? filesInput
        : [...(filesInput?.photo ?? []), ...(filesInput?.['photo[]'] ?? [])];
    const imagePaths = files.map(file => file.path);

    logRequestInfo(req, { imagePaths, imagesCount: imagePaths.length });

    try {
        if (!userId || !name) {
            console.warn('Cadastro: userId ou name ausente');
            return res.status(400).json({ error: 'userId e name são obrigatórios' });
        }

        if (imagePaths.length === 0) {
            console.warn('Cadastro: imagens faciais ausentes');
            return res.status(400).json({ error: 'Ao menos uma imagem facial é obrigatória' });
        }

        const result = await registerUser(userId, name, imagePaths);
        console.log('Resultado do cadastro:', result);

        if (!result.success) {
            console.warn('Cadastro falhou:', result);
            return res.status(400).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        console.error('Erro no cadastro:', error);
        return res.status(500).json({ error: 'Erro interno' });
    } finally {
        for (const imagePath of imagePaths) {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log('Imagem temporária removida:', imagePath);
            }
        }
    }
}

// Rota para validação facial (com ou sem userId)
export async function verify(req: Request, res: Response) {
    const userId = req.body.userId as string | undefined;
    const imagePath = req.file?.path;

    logRequestInfo(req, { imagePath });

    try {
        if (!imagePath) {
            console.warn('Verificação: imagem ausente');
            return res.status(400).json({ error: 'Imagem obrigatória' });
        }

        const result = await verifyHybrid(userId, imagePath);
        console.log('Resultado da verificação:', result);

        return res.json(result);
    } catch (error) {
        console.error('Erro na verificação:', error);
        return res.status(500).json({ error: 'Erro interno' });
    } finally {
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log('Imagem temporária removida:', imagePath);
        }
    }

}
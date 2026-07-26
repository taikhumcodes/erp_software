import { Prisma, type AttachmentCategory } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/AppError.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Define base storage directory inside the api-server
const STORAGE_ROOT = path.join(process.cwd(), 'uploads');

export const PaymentsAttachmentService = {
  async uploadAttachment(
    paymentId: string, 
    userId: string, 
    file: Express.Multer.File, 
    categoryRaw?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, number: true },
      });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      const date = new Date();
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      const dirPath = path.join(STORAGE_ROOT, 'payments', year, month, payment.number);
      await fs.mkdir(dirPath, { recursive: true });

      const storedName = `${Date.now()}-${file.originalname}`;
      const destPath = path.join(dirPath, storedName);

      // Move file from temp to final destination
      await fs.rename(file.path, destPath);

      let category: AttachmentCategory = 'OTHER';
      if (categoryRaw && ['CHEQUE', 'BANK_RECEIPT', 'HANDWRITTEN_SLIP', 'PAYMENT_PROOF', 'OTHER'].includes(categoryRaw)) {
        category = categoryRaw as AttachmentCategory;
      }

      return tx.paymentAttachment.create({
        data: {
          paymentId,
          userId,
          originalName: file.originalname,
          storedName,
          mimeType: file.mimetype,
          size: file.size,
          path: path.relative(process.cwd(), destPath),
          category,
        },
      });
    });
  },

  async getAttachmentFile(attachmentId: string) {
    const attachment = await prisma.paymentAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.deletedAt) {
      throw new AppError('Attachment not found', 404);
    }

    const fullPath = path.resolve(process.cwd(), attachment.path);
    
    try {
      await fs.access(fullPath);
    } catch {
      throw new AppError('File not found on disk', 404);
    }

    return {
      path: fullPath,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
    };
  },

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await prisma.paymentAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.deletedAt) {
      throw new AppError('Attachment not found', 404);
    }

    // Soft delete
    await prisma.paymentAttachment.update({
      where: { id: attachmentId },
      data: {
        deletedById: userId,
        deletedAt: new Date(),
      },
    });
  }
};

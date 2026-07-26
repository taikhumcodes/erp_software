import React from 'react';
import { DocumentType } from '../types';

export interface DocumentRegistration {
  type: DocumentType;
  displayName: string;
  route: string;
  templateComponent: React.ComponentType<{ data: any }>;
  supportedActions: ('PREVIEW' | 'PRINT' | 'PDF')[];
  permissions?: string[];
}

class Registry {
  private documents: Map<DocumentType, DocumentRegistration> = new Map();

  register(registration: DocumentRegistration) {
    if (this.documents.has(registration.type)) {
      console.warn(`Document type ${registration.type} is already registered. Overwriting.`);
    }
    this.documents.set(registration.type, registration);
  }

  get(type: DocumentType): DocumentRegistration | undefined {
    return this.documents.get(type);
  }

  getAll(): DocumentRegistration[] {
    return Array.from(this.documents.values());
  }

  getRouteFor(type: DocumentType): string | undefined {
    return this.documents.get(type)?.route;
  }
}

export const DocumentRegistry = new Registry();

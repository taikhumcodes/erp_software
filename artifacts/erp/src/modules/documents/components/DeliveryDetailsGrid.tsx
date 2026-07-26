/**
 * DeliveryDetailsGrid — Icon-based card grid for delivery order details.
 * Displays delivery address, project/site, expected date, contact info, etc.
 */
import React from 'react';
import { DeliveryDetailCard } from '../types';
import { MapPin, Building, Calendar, Phone, User, MessageSquare, Truck, Car, FileText } from 'lucide-react';

const iconMap: Record<string, React.FC<{ size?: number; style?: React.CSSProperties }>> = {
  'map-pin': MapPin,
  'building': Building,
  'calendar': Calendar,
  'phone': Phone,
  'user': User,
  'message-square': MessageSquare,
  'truck': Truck,
  'car': Car,
  'file-text': FileText,
};

export const DeliveryDetailsGrid: React.FC<{ details: DeliveryDetailCard[]; color?: string }> = ({ details, color = '#D4AF37' }) => {
  if (!details || details.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
      marginBottom: '14px',
      border: `1px solid ${color}40`,
      borderRadius: '4px',
      padding: '10px',
      backgroundColor: '#fefcf3',
    }}>
      {details.map((card, idx) => {
        const IconComponent = iconMap[card.icon] || FileText;
        return (
          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '10px' }}>
            <div style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent size={11} style={{ color }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#111', marginBottom: '1px' }}>{card.label}</div>
              <div style={{ color: '#374151', lineHeight: 1.3 }}>{card.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

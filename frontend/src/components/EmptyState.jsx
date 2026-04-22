import React from 'react';

const EmptyState = ({ 
  title = "No data found", 
  message = "We couldn't find anything matching your criteria.", 
  icon = "📁",
  actionButton = null 
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      backgroundColor: 'transparent'
    }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '16px',
        opacity: 0.5
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--text-dark)',
        marginBottom: '8px'
      }}>{title}</h3>
      <p style={{
        color: 'var(--text-muted)',
        maxWidth: '400px',
        marginBottom: '24px',
        lineHeight: 1.5
      }}>{message}</p>
      
      {actionButton && (
        <div>{actionButton}</div>
      )}
    </div>
  );
};

export default EmptyState;

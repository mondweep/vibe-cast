/**
 * Tag Component
 * Extracted from Figma: Simple UI Kit - Tags (Information Style)
 * Node ID: 74-1012
 *
 * Design specs:
 * - Background: #2871E6 (Primary Blue)
 * - Text: #FFFFFF, Poppins Medium 500, 36px
 * - Padding: 16px 24px
 * - Border radius: 100px (pill)
 * - Layout: Horizontal flex, centered
 */

interface TagProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Tag({ children, variant = 'primary' }: TagProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-poppins font-medium
        ${variant === 'primary'
          ? 'bg-primary text-white'
          : 'bg-secondary text-white'
        }
      `}
      style={{
        // Exact Figma values for pixel-perfect match
        fontSize: '36px',
        lineHeight: '32px',
        paddingTop: '16px',
        paddingBottom: '16px',
        paddingLeft: '24px',
        paddingRight: '24px',
        borderRadius: '100px',
      }}
    >
      {children}
    </span>
  );
}

import {
  Html,
  Heading,
  Section,
  Text,
  Container,
  Hr,
} from '@react-email/components'

interface ContactNotificationProps {
  name: string
  email: string
  message: string
  submissionId: number
}

export const ContactNotificationEmail = ({
  name,
  email,
  message,
  submissionId,
}: ContactNotificationProps) => {
  return (
    <Html>
      <Section style={main}>
        <Container style={container}>
          <Heading style={heading}>New Contact Form Submission</Heading>
          <Text style={paragraph}>
            You have received a new message from your website's contact form.
          </Text>
          <Hr style={hr} />
          <Section style={infoSection}>
            <Text style={label}>Submission ID:</Text>
            <Text style={value}>#{submissionId}</Text>

            <Text style={label}>Name:</Text>
            <Text style={value}>{name}</Text>

            <Text style={label}>Email:</Text>
            <Text style={value}>{email}</Text>
          </Section>
          <Hr style={hr} />
          <Section style={messageSection}>
            <Text style={label}>Message:</Text>
            <Text style={messageContent}>{message.replace(/\n/g, '<br />')}</Text>
          </Section>
        </Container>
      </Section>
    </Html>
  )
}

export default ContactNotificationEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'Arial, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px',
  border: '1px solid #f0f0f0',
  borderRadius: '4px',
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#555',
}

const hr = {
  borderColor: '#e0e0e0',
  margin: '20px 0',
}

const infoSection = {
  padding: '0 10px',
}

const label = {
  fontSize: '14px',
  color: '#888',
  margin: '0',
}

const value = {
  fontSize: '16px',
  color: '#333',
  margin: '4px 0 16px 0',
}

const messageSection = {
  padding: '0 10px',
}

const messageContent = {
  fontSize: '16px',
  color: '#333',
  lineHeight: '24px',
  padding: '10px',
  backgroundColor: '#f9f9f9',
  borderRadius: '4px',
  whiteSpace: 'pre-wrap' as const,
}
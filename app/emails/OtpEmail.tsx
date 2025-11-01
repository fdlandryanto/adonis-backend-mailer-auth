import {
  Html,
  Button,
  Heading,
  Section,
  Text,
  Container,
} from '@react-email/components'

interface OtpEmailProps {
  otp: string
  verificationLink: string
}

export const OtpEmail = ({ otp, verificationLink }: OtpEmailProps) => {
  return (
    <Html>
      <Section style={main}>
        <Container style={container}>
          <Heading style={heading}>Your Verification Code</Heading>
          <Text style={paragraph}>
            Thank you for registering. Please use the following code to verify your
            email address:
          </Text>
          
          <Section style={codeContainer}>
            <Text style={code}>{otp}</Text>
          </Section>

          <Text style={paragraph}>
            Alternatively, you can click the button below:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={verificationLink}>
              Verify Email
            </Button>
          </Section>

          <Text style={paragraph}>
            If you didn't request this, please ignore this email.
          </Text>
        </Container>
      </Section>
    </Html>
  )
}

export default OtpEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'Arial, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  border: '1px solid #f0f0f0',
  borderRadius: '4px',
}

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  marginTop: '0',
  textAlign: 'center' as const,
  color: '#333',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#555',
  padding: '0 20px',
}

const codeContainer = {
  background: '#f0f0f0',
  borderRadius: '4px',
  margin: '16px auto',
  padding: '10px 0',
  width: '80%',
}

const code = {
  color: '#000',
  fontSize: '32px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  letterSpacing: '4px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '20px',
}

const button = {
  backgroundColor: '#007bff',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  padding: '12px 20px',
}
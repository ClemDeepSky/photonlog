/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirmez votre email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>AstroTracker</Text>
        <Heading style={h1}>Confirmez votre email</Heading>
        <Text style={text}>
          Merci de votre inscription sur{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Confirmez votre adresse email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) en cliquant sur le bouton ci-dessous :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon email
        </Button>
        <Text style={footer}>
          Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "Roboto, 'Helvetica Neue', Arial, sans-serif",
}
const container = {
  padding: '32px 28px',
  maxWidth: '520px',
  borderTop: '3px solid #22d3ee',
}
const brand = {
  fontSize: '13px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: '#22d3ee',
  fontWeight: 500 as const,
  margin: '0 0 18px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 500 as const,
  color: '#0a1120',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#5b6472',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: '#0e7490', textDecoration: 'underline' }
const button = {
  backgroundColor: '#22d3ee',
  color: '#0a1120',
  fontSize: '15px',
  fontWeight: 500 as const,
  borderRadius: '10px',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#8b93a1',
  margin: '32px 0 0',
  borderTop: '1px solid #e7eaef',
  paddingTop: '16px',
}

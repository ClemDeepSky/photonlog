/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Votre code de vérification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Photonlog</Text>
        <Heading style={h1}>Code de vérification</Heading>
        <Text style={text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ce code expire rapidement. Si vous n'êtes pas à l'origine de cette demande,
          ignorez cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  letterSpacing: '6px',
  fontWeight: 700 as const,
  color: '#0a1120',
  margin: '0 0 30px',
}
const footer = {
  fontSize: '12px',
  color: '#8b93a1',
  margin: '32px 0 0',
  borderTop: '1px solid #e7eaef',
  paddingTop: '16px',
}

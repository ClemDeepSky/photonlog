/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Réinitialisez votre mot de passe pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Photonlog</Text>
        <Heading style={h1}>Réinitialisation du mot de passe</Heading>
        <Text style={text}>
          Nous avons reçu une demande de réinitialisation de votre mot de passe sur
          {siteName}. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Choisir un nouveau mot de passe
        </Button>
        <Text style={footer}>
          Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre
          mot de passe restera inchangé.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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

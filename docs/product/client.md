# Stackivo — Client Access, Contracts & Signature System Architecture

## Overview

This document defines the complete architecture and implementation strategy for the client-side interaction system inside Stackivo.

The goal is to build:
- frictionless client interactions
- lightweight contract workflows
- invoice/payment access
- professional document handling
- scalable signature infrastructure

WITHOUT overbuilding a heavy enterprise client portal during MVP stage.

---

# Core Product Philosophy

Stackivo is primarily built for freelancers.

Clients are secondary transactional users.

Therefore:
- freelancers are the core paying users
- clients are temporary interaction participants

The platform should optimize for:
- simplicity
- speed
- legal document handling
- payment completion
- minimal friction
- professional presentation

NOT:
- enterprise collaboration
- complicated dashboards
- account-heavy onboarding
- CRM-style systems

---

# Strategic Product Decision

## DO NOT BUILD INITIALLY
- full client portal
- mandatory client accounts
- complex workspace systems
- project management suites
- enterprise collaboration tools

---

## BUILD INSTEAD
- secure client access layer
- tokenized document access
- lightweight interaction pages
- embedded signing workflows
- professional invoice system

This creates:
- faster adoption
- lower friction
- easier implementation
- better freelancer experience
- scalable future architecture

---

# MVP Scope

# Freelancer Features

Freelancers can:
- create clients
- create contracts
- create invoices
- send contracts
- send invoices
- track document status
- track payment status
- resend links
- download PDFs
- manage projects
- upload signatures

---

# Client Features

Clients can:
- open secure links
- view contracts
- sign contracts
- view invoices
- pay invoices
- download PDFs
- view basic project status

WITHOUT:
- creating account
- setting password
- onboarding flow

---

# Freelancer Signature System

# IMPORTANT REQUIREMENT

During freelancer onboarding, Stackivo should require freelancers to configure a signature.

This signature will automatically appear on:
- contracts
- invoices
- proposals
- generated PDFs

This creates:
- professional branding
- legal appearance
- document authenticity

---

# Freelancer Signature Options

# Option 1 — Upload Signature Image (RECOMMENDED)

Accepted formats:
- PNG
- JPG
- WEBP

Preferred:
- transparent PNG

Advantages:
- realistic signature appearance
- professional look
- reusable everywhere

---

# Option 2 — Draw Signature

Freelancer signs directly inside browser.

Use:
- mouse
- touchscreen
- trackpad

Store result as:
- generated image asset

---

# Option 3 — Typed Signature

Freelancer types their name.

System generates stylized signature font.

Useful for:
- quick onboarding
- accessibility
- mobile-first users

---

# Freelancer Signature Storage

Recommended database fields:

```txt
signature_type
signature_image_url
signature_font_value
signature_created_at
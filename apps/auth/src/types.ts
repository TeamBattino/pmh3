// ---------------------------------------------------------------------------
// MiData upstream types (what db.scout.ch/oauth/userinfo returns)
// ---------------------------------------------------------------------------

export interface MiDataRole {
  group_id: number;
  group_name: string;
  role: string;
  role_class: string;
  role_name: string;
  permissions: string[];
}

export interface MiDataUserInfo {
  /** MiData returns `id` (number) from the profile endpoint. */
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  company_name: string | null;
  company: boolean;
  address_care_of: string | null;
  street: string;
  housenumber: string;
  postbox: string | null;
  zip_code: string;
  town: string;
  country: string;
  gender: string;
  birthday: string;
  language: string;
  primary_group_id: number;
  kantonalverband_id: number;
  roles: MiDataRole[];
}

// ---------------------------------------------------------------------------
// Auth service internal types
// ---------------------------------------------------------------------------

export interface AuthClient {
  clientId: string;
  clientSecretHash: string;
  name: string;
  description: string;
  redirectUris: string[];
}

export interface PendingAuthorization {
  state: string;
  clientId: string;
  redirectUri: string;
  clientState: string;
  scope: string;
  nonce?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  createdAt: Date;
}

export interface StoredAuthCode {
  code: string;
  clientId: string;
  userId: string;
  userInfo: MiDataUserInfo;
  roles: string[];
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  nonce?: string;
  scope: string;
  createdAt: Date;
}

export interface StoredAccessToken {
  token: string;
  userId: string;
  clientId: string;
  userInfo: MiDataUserInfo;
  roles: string[];
  scope: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Security config types (shared with admin app)
// ---------------------------------------------------------------------------

export interface MidataGroupMapping {
  groupId: number;
  roleClasses: string[];
}

export interface Role {
  name: string;
  description: string;
  permissions: string[];
  midataGroupMappings: MidataGroupMapping[];
  allowedClients: string[];
}

export interface SecurityConfig {
  roles: Role[];
}

// ---------------------------------------------------------------------------
// Environment config
// ---------------------------------------------------------------------------

export interface EnvConfig {
  port: number;
  issuerUrl: string;

  // MiData upstream
  midataAuthorizeUrl: string;
  midataTokenUrl: string;
  midataUserinfoUrl: string;
  midataClientId: string;
  midataClientSecret: string;

  // MongoDB
  mongoConnectionString: string;
  mongoDbName: string;

  // Signing key (PEM or auto-generate in dev)
  signingKeyPem?: string;
}

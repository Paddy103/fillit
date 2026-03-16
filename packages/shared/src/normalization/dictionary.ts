/**
 * Label dictionary for field normalization.
 *
 * Maps normalized (lowercase, stripped) OCR-detected field labels
 * to standardized profile field paths. Supports English, Afrikaans,
 * and common abbreviations/typos relevant to the South African market.
 */

/**
 * Dictionary entry mapping a normalized label to a profile field path.
 */
export interface DictionaryEntry {
  fieldPath: string;
  category: string;
}

/**
 * Complete label-to-field dictionary.
 * Keys are normalized labels (lowercase, no punctuation).
 * Values contain the profile field path and category.
 */
export const LABEL_DICTIONARY: Record<string, DictionaryEntry> = {
  // ─── Personal Info: First Name ───────────────────────────────────
  'first name': { fieldPath: 'firstName', category: 'personal' },
  firstname: { fieldPath: 'firstName', category: 'personal' },
  'first names': { fieldPath: 'firstName', category: 'personal' },
  forename: { fieldPath: 'firstName', category: 'personal' },
  forenames: { fieldPath: 'firstName', category: 'personal' },
  'given name': { fieldPath: 'firstName', category: 'personal' },
  'given names': { fieldPath: 'firstName', category: 'personal' },
  name: { fieldPath: 'firstName', category: 'personal' },
  naam: { fieldPath: 'firstName', category: 'personal' },
  voornaam: { fieldPath: 'firstName', category: 'personal' },
  voorname: { fieldPath: 'firstName', category: 'personal' },
  first: { fieldPath: 'firstName', category: 'personal' },
  'christian name': { fieldPath: 'firstName', category: 'personal' },

  // ─── Personal Info: Middle Name ──────────────────────────────────
  'middle name': { fieldPath: 'middleName', category: 'personal' },
  middlename: { fieldPath: 'middleName', category: 'personal' },
  'middle names': { fieldPath: 'middleName', category: 'personal' },
  'second name': { fieldPath: 'middleName', category: 'personal' },
  'tweede naam': { fieldPath: 'middleName', category: 'personal' },
  middelnaam: { fieldPath: 'middleName', category: 'personal' },
  middelname: { fieldPath: 'middleName', category: 'personal' },

  // ─── Personal Info: Last Name ────────────────────────────────────
  'last name': { fieldPath: 'lastName', category: 'personal' },
  lastname: { fieldPath: 'lastName', category: 'personal' },
  surname: { fieldPath: 'lastName', category: 'personal' },
  'family name': { fieldPath: 'lastName', category: 'personal' },
  van: { fieldPath: 'lastName', category: 'personal' },
  noemnaam: { fieldPath: 'lastName', category: 'personal' },
  familienaam: { fieldPath: 'lastName', category: 'personal' },
  last: { fieldPath: 'lastName', category: 'personal' },

  // ─── Personal Info: Maiden Name ──────────────────────────────────
  'maiden name': { fieldPath: 'maidenName', category: 'personal' },
  nee: { fieldPath: 'maidenName', category: 'personal' },
  'birth name': { fieldPath: 'maidenName', category: 'personal' },
  nooiensvan: { fieldPath: 'maidenName', category: 'personal' },
  'previous surname': { fieldPath: 'maidenName', category: 'personal' },
  'former surname': { fieldPath: 'maidenName', category: 'personal' },

  // ─── Personal Info: Full Name ────────────────────────────────────
  'full name': { fieldPath: 'firstName', category: 'personal' },
  'full names': { fieldPath: 'firstName', category: 'personal' },
  'volle naam': { fieldPath: 'firstName', category: 'personal' },
  'name and surname': { fieldPath: 'firstName', category: 'personal' },
  'naam en van': { fieldPath: 'firstName', category: 'personal' },

  // ─── Personal Info: Date of Birth ────────────────────────────────
  'date of birth': { fieldPath: 'dateOfBirth', category: 'personal' },
  dob: { fieldPath: 'dateOfBirth', category: 'personal' },
  'birth date': { fieldPath: 'dateOfBirth', category: 'personal' },
  birthdate: { fieldPath: 'dateOfBirth', category: 'personal' },
  'd.o.b': { fieldPath: 'dateOfBirth', category: 'personal' },
  'd.o.b.': { fieldPath: 'dateOfBirth', category: 'personal' },
  geboortedatum: { fieldPath: 'dateOfBirth', category: 'personal' },
  'geboorte datum': { fieldPath: 'dateOfBirth', category: 'personal' },
  'date birth': { fieldPath: 'dateOfBirth', category: 'personal' },
  born: { fieldPath: 'dateOfBirth', category: 'personal' },
  birthday: { fieldPath: 'dateOfBirth', category: 'personal' },
  gebore: { fieldPath: 'dateOfBirth', category: 'personal' },

  // ─── Personal Info: Gender ───────────────────────────────────────
  gender: { fieldPath: 'gender', category: 'personal' },
  sex: { fieldPath: 'gender', category: 'personal' },
  geslag: { fieldPath: 'gender', category: 'personal' },
  'male female': { fieldPath: 'gender', category: 'personal' },
  'm f': { fieldPath: 'gender', category: 'personal' },

  // ─── Personal Info: Marital Status ───────────────────────────────
  'marital status': { fieldPath: 'maritalStatus', category: 'personal' },
  marital: { fieldPath: 'maritalStatus', category: 'personal' },
  huwelikstatus: { fieldPath: 'maritalStatus', category: 'personal' },
  huweliksstatus: { fieldPath: 'maritalStatus', category: 'personal' },
  'married single': { fieldPath: 'maritalStatus', category: 'personal' },
  'civil status': { fieldPath: 'maritalStatus', category: 'personal' },

  // ─── Personal Info: Nationality ──────────────────────────────────
  nationality: { fieldPath: 'nationality', category: 'personal' },
  nasionaliteit: { fieldPath: 'nationality', category: 'personal' },
  citizen: { fieldPath: 'nationality', category: 'personal' },
  citizenship: { fieldPath: 'citizenship', category: 'personal' },
  burgerskap: { fieldPath: 'citizenship', category: 'personal' },
  'country of origin': { fieldPath: 'nationality', category: 'personal' },

  // ─── Personal Info: Title ────────────────────────────────────────
  title: { fieldPath: 'title', category: 'personal' },
  titel: { fieldPath: 'title', category: 'personal' },
  'mr mrs': { fieldPath: 'title', category: 'personal' },
  'mr ms mrs': { fieldPath: 'title', category: 'personal' },
  prefix: { fieldPath: 'title', category: 'personal' },

  // ─── Contact: Email ──────────────────────────────────────────────
  email: { fieldPath: 'email', category: 'contact' },
  'email address': { fieldPath: 'email', category: 'contact' },
  'e-mail': { fieldPath: 'email', category: 'contact' },
  'e mail': { fieldPath: 'email', category: 'contact' },
  epos: { fieldPath: 'email', category: 'contact' },
  eposadres: { fieldPath: 'email', category: 'contact' },
  'epos adres': { fieldPath: 'email', category: 'contact' },
  'electronic mail': { fieldPath: 'email', category: 'contact' },
  emailaddress: { fieldPath: 'email', category: 'contact' },
  mail: { fieldPath: 'email', category: 'contact' },

  // ─── Contact: Mobile Phone ───────────────────────────────────────
  phone: { fieldPath: 'phoneMobile', category: 'contact' },
  'phone number': { fieldPath: 'phoneMobile', category: 'contact' },
  cell: { fieldPath: 'phoneMobile', category: 'contact' },
  'cell number': { fieldPath: 'phoneMobile', category: 'contact' },
  cellphone: { fieldPath: 'phoneMobile', category: 'contact' },
  'cell phone': { fieldPath: 'phoneMobile', category: 'contact' },
  mobile: { fieldPath: 'phoneMobile', category: 'contact' },
  'mobile number': { fieldPath: 'phoneMobile', category: 'contact' },
  'mobile phone': { fieldPath: 'phoneMobile', category: 'contact' },
  'contact number': { fieldPath: 'phoneMobile', category: 'contact' },
  telephone: { fieldPath: 'phoneMobile', category: 'contact' },
  'telephone number': { fieldPath: 'phoneMobile', category: 'contact' },
  tel: { fieldPath: 'phoneMobile', category: 'contact' },
  'tel no': { fieldPath: 'phoneMobile', category: 'contact' },
  'tel number': { fieldPath: 'phoneMobile', category: 'contact' },
  selfoon: { fieldPath: 'phoneMobile', category: 'contact' },
  telefoonnommer: { fieldPath: 'phoneMobile', category: 'contact' },
  'telefoon nommer': { fieldPath: 'phoneMobile', category: 'contact' },
  'selfoon nommer': { fieldPath: 'phoneMobile', category: 'contact' },
  selfoonnommer: { fieldPath: 'phoneMobile', category: 'contact' },
  'kontak nommer': { fieldPath: 'phoneMobile', category: 'contact' },
  kontaknommer: { fieldPath: 'phoneMobile', category: 'contact' },
  foon: { fieldPath: 'phoneMobile', category: 'contact' },
  foonnommer: { fieldPath: 'phoneMobile', category: 'contact' },
  'foon nommer': { fieldPath: 'phoneMobile', category: 'contact' },

  // ─── Contact: Work Phone ─────────────────────────────────────────
  'work phone': { fieldPath: 'phoneWork', category: 'contact' },
  'work number': { fieldPath: 'phoneWork', category: 'contact' },
  'work tel': { fieldPath: 'phoneWork', category: 'contact' },
  'office phone': { fieldPath: 'phoneWork', category: 'contact' },
  'office number': { fieldPath: 'phoneWork', category: 'contact' },
  'business phone': { fieldPath: 'phoneWork', category: 'contact' },
  'werk telefoon': { fieldPath: 'phoneWork', category: 'contact' },
  'werk nommer': { fieldPath: 'phoneWork', category: 'contact' },
  werknommer: { fieldPath: 'phoneWork', category: 'contact' },
  'kantoor nommer': { fieldPath: 'phoneWork', category: 'contact' },
  kantoornommer: { fieldPath: 'phoneWork', category: 'contact' },

  // ─── Contact: Fax ────────────────────────────────────────────────
  fax: { fieldPath: 'fax', category: 'contact' },
  'fax number': { fieldPath: 'fax', category: 'contact' },
  'fax no': { fieldPath: 'fax', category: 'contact' },
  faksnommer: { fieldPath: 'fax', category: 'contact' },
  faks: { fieldPath: 'fax', category: 'contact' },
  'faks nommer': { fieldPath: 'fax', category: 'contact' },

  // ─── Address: Street ─────────────────────────────────────────────
  address: { fieldPath: 'addresses[0].street1', category: 'address' },
  street: { fieldPath: 'addresses[0].street1', category: 'address' },
  'street address': { fieldPath: 'addresses[0].street1', category: 'address' },
  'address line 1': { fieldPath: 'addresses[0].street1', category: 'address' },
  'address line1': { fieldPath: 'addresses[0].street1', category: 'address' },
  'address 1': { fieldPath: 'addresses[0].street1', category: 'address' },
  'residential address': { fieldPath: 'addresses[0].street1', category: 'address' },
  'home address': { fieldPath: 'addresses[0].street1', category: 'address' },
  'physical address': { fieldPath: 'addresses[0].street1', category: 'address' },
  adres: { fieldPath: 'addresses[0].street1', category: 'address' },
  straat: { fieldPath: 'addresses[0].street1', category: 'address' },
  straatadres: { fieldPath: 'addresses[0].street1', category: 'address' },
  'straat adres': { fieldPath: 'addresses[0].street1', category: 'address' },
  woonadres: { fieldPath: 'addresses[0].street1', category: 'address' },
  'fisiese adres': { fieldPath: 'addresses[0].street1', category: 'address' },
  'postal address': { fieldPath: 'addresses[0].street1', category: 'address' },
  'mailing address': { fieldPath: 'addresses[0].street1', category: 'address' },
  posadres: { fieldPath: 'addresses[0].street1', category: 'address' },

  // ─── Address: Street Line 2 ──────────────────────────────────────
  'address line 2': { fieldPath: 'addresses[0].street2', category: 'address' },
  'address line2': { fieldPath: 'addresses[0].street2', category: 'address' },
  'address 2': { fieldPath: 'addresses[0].street2', category: 'address' },
  'street 2': { fieldPath: 'addresses[0].street2', category: 'address' },
  'unit number': { fieldPath: 'addresses[0].street2', category: 'address' },
  apartment: { fieldPath: 'addresses[0].street2', category: 'address' },
  complex: { fieldPath: 'addresses[0].street2', category: 'address' },
  building: { fieldPath: 'addresses[0].street2', category: 'address' },

  // ─── Address: Suburb ─────────────────────────────────────────────
  suburb: { fieldPath: 'addresses[0].suburb', category: 'address' },
  area: { fieldPath: 'addresses[0].suburb', category: 'address' },
  neighbourhood: { fieldPath: 'addresses[0].suburb', category: 'address' },
  neighborhood: { fieldPath: 'addresses[0].suburb', category: 'address' },
  voorstad: { fieldPath: 'addresses[0].suburb', category: 'address' },
  woonbuurt: { fieldPath: 'addresses[0].suburb', category: 'address' },

  // ─── Address: City ───────────────────────────────────────────────
  city: { fieldPath: 'addresses[0].city', category: 'address' },
  town: { fieldPath: 'addresses[0].city', category: 'address' },
  'city town': { fieldPath: 'addresses[0].city', category: 'address' },
  stad: { fieldPath: 'addresses[0].city', category: 'address' },
  dorp: { fieldPath: 'addresses[0].city', category: 'address' },

  // ─── Address: Province ───────────────────────────────────────────
  province: { fieldPath: 'addresses[0].province', category: 'address' },
  state: { fieldPath: 'addresses[0].province', category: 'address' },
  region: { fieldPath: 'addresses[0].province', category: 'address' },
  provinsie: { fieldPath: 'addresses[0].province', category: 'address' },

  // ─── Address: Postal Code ────────────────────────────────────────
  'postal code': { fieldPath: 'addresses[0].postalCode', category: 'address' },
  postalcode: { fieldPath: 'addresses[0].postalCode', category: 'address' },
  'zip code': { fieldPath: 'addresses[0].postalCode', category: 'address' },
  zip: { fieldPath: 'addresses[0].postalCode', category: 'address' },
  'post code': { fieldPath: 'addresses[0].postalCode', category: 'address' },
  postcode: { fieldPath: 'addresses[0].postalCode', category: 'address' },
  poskode: { fieldPath: 'addresses[0].postalCode', category: 'address' },
  'pos kode': { fieldPath: 'addresses[0].postalCode', category: 'address' },
  code: { fieldPath: 'addresses[0].postalCode', category: 'address' },

  // ─── Address: Country ────────────────────────────────────────────
  country: { fieldPath: 'addresses[0].country', category: 'address' },
  land: { fieldPath: 'addresses[0].country', category: 'address' },

  // ─── Identity: SA ID ─────────────────────────────────────────────
  'id number': { fieldPath: 'saIdNumber', category: 'identity' },
  'id no': { fieldPath: 'saIdNumber', category: 'identity' },
  id: { fieldPath: 'saIdNumber', category: 'identity' },
  'identity number': { fieldPath: 'saIdNumber', category: 'identity' },
  'identity no': { fieldPath: 'saIdNumber', category: 'identity' },
  'sa id': { fieldPath: 'saIdNumber', category: 'identity' },
  'sa id number': { fieldPath: 'saIdNumber', category: 'identity' },
  'rsa id': { fieldPath: 'saIdNumber', category: 'identity' },
  'rsa id number': { fieldPath: 'saIdNumber', category: 'identity' },
  'id nommer': { fieldPath: 'saIdNumber', category: 'identity' },
  'id nr': { fieldPath: 'saIdNumber', category: 'identity' },
  identiteitsnommer: { fieldPath: 'saIdNumber', category: 'identity' },
  'identiteits nommer': { fieldPath: 'saIdNumber', category: 'identity' },
  identiteitsnr: { fieldPath: 'saIdNumber', category: 'identity' },
  'sa identiteitsnommer': { fieldPath: 'saIdNumber', category: 'identity' },

  // ─── Identity: Passport ──────────────────────────────────────────
  passport: { fieldPath: 'documents[passport].number', category: 'identity' },
  'passport number': { fieldPath: 'documents[passport].number', category: 'identity' },
  'passport no': { fieldPath: 'documents[passport].number', category: 'identity' },
  paspoort: { fieldPath: 'documents[passport].number', category: 'identity' },
  paspoortnommer: { fieldPath: 'documents[passport].number', category: 'identity' },
  'paspoort nommer': { fieldPath: 'documents[passport].number', category: 'identity' },
  'travel document': { fieldPath: 'documents[passport].number', category: 'identity' },

  // ─── Identity: Driving License ───────────────────────────────────
  'drivers license': { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  'drivers licence': { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  'driver license': { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  'driver licence': { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  'driving license': { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  'driving licence': { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  'license number': { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  'licence number': { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  rylisensie: { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  bestuurslisensie: { fieldPath: 'documents[drivers_license].number', category: 'identity' },
  lisensienommer: { fieldPath: 'documents[drivers_license].number', category: 'identity' },

  // ─── Identity: Tax Number ────────────────────────────────────────
  'tax number': { fieldPath: 'documents[tax_number].number', category: 'identity' },
  'tax no': { fieldPath: 'documents[tax_number].number', category: 'identity' },
  'tax reference': { fieldPath: 'documents[tax_number].number', category: 'identity' },
  'tax ref': { fieldPath: 'documents[tax_number].number', category: 'identity' },
  'sars number': { fieldPath: 'documents[tax_number].number', category: 'identity' },
  'income tax number': { fieldPath: 'documents[tax_number].number', category: 'identity' },
  belastingnommer: { fieldPath: 'documents[tax_number].number', category: 'identity' },
  'belasting nommer': { fieldPath: 'documents[tax_number].number', category: 'identity' },

  // ─── Banking ─────────────────────────────────────────────────────
  bank: { fieldPath: 'documents[bank_account].additionalFields.bankName', category: 'banking' },
  'bank name': {
    fieldPath: 'documents[bank_account].additionalFields.bankName',
    category: 'banking',
  },
  banknaam: { fieldPath: 'documents[bank_account].additionalFields.bankName', category: 'banking' },
  'bank naam': {
    fieldPath: 'documents[bank_account].additionalFields.bankName',
    category: 'banking',
  },
  'account number': { fieldPath: 'documents[bank_account].number', category: 'banking' },
  'account no': { fieldPath: 'documents[bank_account].number', category: 'banking' },
  'acc number': { fieldPath: 'documents[bank_account].number', category: 'banking' },
  'acc no': { fieldPath: 'documents[bank_account].number', category: 'banking' },
  'bank account': { fieldPath: 'documents[bank_account].number', category: 'banking' },
  'bank account number': { fieldPath: 'documents[bank_account].number', category: 'banking' },
  rekeningnommer: { fieldPath: 'documents[bank_account].number', category: 'banking' },
  'rekening nommer': { fieldPath: 'documents[bank_account].number', category: 'banking' },
  rekening: { fieldPath: 'documents[bank_account].number', category: 'banking' },
  'branch code': {
    fieldPath: 'documents[bank_account].additionalFields.branchCode',
    category: 'banking',
  },
  branch: { fieldPath: 'documents[bank_account].additionalFields.branchCode', category: 'banking' },
  'branch number': {
    fieldPath: 'documents[bank_account].additionalFields.branchCode',
    category: 'banking',
  },
  takkode: {
    fieldPath: 'documents[bank_account].additionalFields.branchCode',
    category: 'banking',
  },
  'tak kode': {
    fieldPath: 'documents[bank_account].additionalFields.branchCode',
    category: 'banking',
  },
  'account type': {
    fieldPath: 'documents[bank_account].additionalFields.accountType',
    category: 'banking',
  },
  rekeningtipe: {
    fieldPath: 'documents[bank_account].additionalFields.accountType',
    category: 'banking',
  },
  'rekening tipe': {
    fieldPath: 'documents[bank_account].additionalFields.accountType',
    category: 'banking',
  },
  'account holder': {
    fieldPath: 'documents[bank_account].additionalFields.accountHolder',
    category: 'banking',
  },
  rekeninghouer: {
    fieldPath: 'documents[bank_account].additionalFields.accountHolder',
    category: 'banking',
  },

  // ─── Employment ──────────────────────────────────────────────────
  employer: { fieldPath: 'employer', category: 'employment' },
  'employer name': { fieldPath: 'employer', category: 'employment' },
  company: { fieldPath: 'employer', category: 'employment' },
  'company name': { fieldPath: 'employer', category: 'employment' },
  werkgewer: { fieldPath: 'employer', category: 'employment' },
  werkgewernaam: { fieldPath: 'employer', category: 'employment' },
  'werkgewer naam': { fieldPath: 'employer', category: 'employment' },
  maatskappy: { fieldPath: 'employer', category: 'employment' },
  organisation: { fieldPath: 'employer', category: 'employment' },
  organization: { fieldPath: 'employer', category: 'employment' },
  firm: { fieldPath: 'employer', category: 'employment' },

  occupation: { fieldPath: 'jobTitle', category: 'employment' },
  'job title': { fieldPath: 'jobTitle', category: 'employment' },
  position: { fieldPath: 'jobTitle', category: 'employment' },
  designation: { fieldPath: 'jobTitle', category: 'employment' },
  profession: { fieldPath: 'jobTitle', category: 'employment' },
  beroep: { fieldPath: 'jobTitle', category: 'employment' },
  posisie: { fieldPath: 'jobTitle', category: 'employment' },
  pos: { fieldPath: 'jobTitle', category: 'employment' },
  'werk titel': { fieldPath: 'jobTitle', category: 'employment' },
  werktitel: { fieldPath: 'jobTitle', category: 'employment' },

  'employee number': { fieldPath: 'employeeNumber', category: 'employment' },
  'employee no': { fieldPath: 'employeeNumber', category: 'employment' },
  'emp no': { fieldPath: 'employeeNumber', category: 'employment' },
  'emp number': { fieldPath: 'employeeNumber', category: 'employment' },
  'staff number': { fieldPath: 'employeeNumber', category: 'employment' },
  'staff no': { fieldPath: 'employeeNumber', category: 'employment' },
  personeelnommer: { fieldPath: 'employeeNumber', category: 'employment' },
  'personeel nommer': { fieldPath: 'employeeNumber', category: 'employment' },
  werknemernommer: { fieldPath: 'employeeNumber', category: 'employment' },
  'werknemer nommer': { fieldPath: 'employeeNumber', category: 'employment' },

  industry: { fieldPath: 'industry', category: 'employment' },
  sector: { fieldPath: 'industry', category: 'employment' },
  bedryf: { fieldPath: 'industry', category: 'employment' },
  industrie: { fieldPath: 'industry', category: 'employment' },

  'work address': { fieldPath: 'workAddress.street1', category: 'employment' },
  'employer address': { fieldPath: 'workAddress.street1', category: 'employment' },
  'business address': { fieldPath: 'workAddress.street1', category: 'employment' },
  werkadres: { fieldPath: 'workAddress.street1', category: 'employment' },
  'werk adres': { fieldPath: 'workAddress.street1', category: 'employment' },
  besigheidsadres: { fieldPath: 'workAddress.street1', category: 'employment' },

  // ─── Medical Aid ─────────────────────────────────────────────────
  'medical aid': { fieldPath: 'documents[medical_aid].label', category: 'medical' },
  'medical scheme': { fieldPath: 'documents[medical_aid].label', category: 'medical' },
  'medical fund': { fieldPath: 'documents[medical_aid].label', category: 'medical' },
  'health insurance': { fieldPath: 'documents[medical_aid].label', category: 'medical' },
  'mediese fonds': { fieldPath: 'documents[medical_aid].label', category: 'medical' },
  'mediese skema': { fieldPath: 'documents[medical_aid].label', category: 'medical' },
  mediesefonds: { fieldPath: 'documents[medical_aid].label', category: 'medical' },
  'mediese hulp': { fieldPath: 'documents[medical_aid].label', category: 'medical' },

  'medical aid number': { fieldPath: 'documents[medical_aid].number', category: 'medical' },
  'medical aid no': { fieldPath: 'documents[medical_aid].number', category: 'medical' },
  'membership number': { fieldPath: 'documents[medical_aid].number', category: 'medical' },
  'member number': { fieldPath: 'documents[medical_aid].number', category: 'medical' },
  'member no': { fieldPath: 'documents[medical_aid].number', category: 'medical' },
  lidnommer: { fieldPath: 'documents[medical_aid].number', category: 'medical' },
  'lid nommer': { fieldPath: 'documents[medical_aid].number', category: 'medical' },
  lidmaatskapnommer: { fieldPath: 'documents[medical_aid].number', category: 'medical' },

  'medical aid plan': {
    fieldPath: 'documents[medical_aid].additionalFields.plan',
    category: 'medical',
  },
  plan: { fieldPath: 'documents[medical_aid].additionalFields.plan', category: 'medical' },
  option: { fieldPath: 'documents[medical_aid].additionalFields.plan', category: 'medical' },
  'plan option': { fieldPath: 'documents[medical_aid].additionalFields.plan', category: 'medical' },

  'main member': {
    fieldPath: 'documents[medical_aid].additionalFields.mainMember',
    category: 'medical',
  },
  'principal member': {
    fieldPath: 'documents[medical_aid].additionalFields.mainMember',
    category: 'medical',
  },
  hooflid: { fieldPath: 'documents[medical_aid].additionalFields.mainMember', category: 'medical' },

  dependant: {
    fieldPath: 'documents[medical_aid].additionalFields.dependantNumber',
    category: 'medical',
  },
  'dependant number': {
    fieldPath: 'documents[medical_aid].additionalFields.dependantNumber',
    category: 'medical',
  },
  dependent: {
    fieldPath: 'documents[medical_aid].additionalFields.dependantNumber',
    category: 'medical',
  },
  'dependent number': {
    fieldPath: 'documents[medical_aid].additionalFields.dependantNumber',
    category: 'medical',
  },
  'dependant no': {
    fieldPath: 'documents[medical_aid].additionalFields.dependantNumber',
    category: 'medical',
  },
  afhanklike: {
    fieldPath: 'documents[medical_aid].additionalFields.dependantNumber',
    category: 'medical',
  },
  'afhanklike nommer': {
    fieldPath: 'documents[medical_aid].additionalFields.dependantNumber',
    category: 'medical',
  },

  // ─── Emergency Contact ───────────────────────────────────────────
  'emergency contact': { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  'emergency contact name': { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  noodkontak: { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  'nood kontak': { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  noodkontaknaam: { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  'ice contact': { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  'in case of emergency': { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },

  'emergency number': { fieldPath: 'emergencyContacts[0].phoneMobile', category: 'emergency' },
  'emergency phone': { fieldPath: 'emergencyContacts[0].phoneMobile', category: 'emergency' },
  'emergency contact number': {
    fieldPath: 'emergencyContacts[0].phoneMobile',
    category: 'emergency',
  },
  'emergency tel': { fieldPath: 'emergencyContacts[0].phoneMobile', category: 'emergency' },
  noodkontaknommer: { fieldPath: 'emergencyContacts[0].phoneMobile', category: 'emergency' },
  'nood kontak nommer': { fieldPath: 'emergencyContacts[0].phoneMobile', category: 'emergency' },

  'emergency relationship': {
    fieldPath: 'emergencyContacts[0].relationship',
    category: 'emergency',
  },
  relationship: { fieldPath: 'emergencyContacts[0].relationship', category: 'emergency' },
  relation: { fieldPath: 'emergencyContacts[0].relationship', category: 'emergency' },
  verwantskap: { fieldPath: 'emergencyContacts[0].relationship', category: 'emergency' },
  verhouding: { fieldPath: 'emergencyContacts[0].relationship', category: 'emergency' },

  // ─── Next of Kin ─────────────────────────────────────────────────
  'next of kin': { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  'next of kin name': { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  'naaste familie': { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  naasbestaande: { fieldPath: 'emergencyContacts[0].firstName', category: 'emergency' },
  'next of kin number': { fieldPath: 'emergencyContacts[0].phoneMobile', category: 'emergency' },
  'next of kin phone': { fieldPath: 'emergencyContacts[0].phoneMobile', category: 'emergency' },
  'next of kin contact': { fieldPath: 'emergencyContacts[0].phoneMobile', category: 'emergency' },
  'next of kin relationship': {
    fieldPath: 'emergencyContacts[0].relationship',
    category: 'emergency',
  },

  // ─── Education ───────────────────────────────────────────────────
  school: { fieldPath: 'institution', category: 'education' },
  university: { fieldPath: 'institution', category: 'education' },
  institution: { fieldPath: 'institution', category: 'education' },
  college: { fieldPath: 'institution', category: 'education' },
  instelling: { fieldPath: 'institution', category: 'education' },
  universiteit: { fieldPath: 'institution', category: 'education' },
  skool: { fieldPath: 'institution', category: 'education' },
  kollege: { fieldPath: 'institution', category: 'education' },

  qualification: { fieldPath: 'highestQualification', category: 'education' },
  'highest qualification': { fieldPath: 'highestQualification', category: 'education' },
  degree: { fieldPath: 'highestQualification', category: 'education' },
  diploma: { fieldPath: 'highestQualification', category: 'education' },
  certificate: { fieldPath: 'highestQualification', category: 'education' },
  kwalifikasie: { fieldPath: 'highestQualification', category: 'education' },
  'hoogste kwalifikasie': { fieldPath: 'highestQualification', category: 'education' },
  graad: { fieldPath: 'highestQualification', category: 'education' },
  sertifikaat: { fieldPath: 'highestQualification', category: 'education' },

  'year completed': { fieldPath: 'yearCompleted', category: 'education' },
  'year obtained': { fieldPath: 'yearCompleted', category: 'education' },
  'graduation year': { fieldPath: 'yearCompleted', category: 'education' },
  'jaar behaal': { fieldPath: 'yearCompleted', category: 'education' },
  'jaar voltooi': { fieldPath: 'yearCompleted', category: 'education' },

  'student number': { fieldPath: 'studentNumber', category: 'education' },
  'student no': { fieldPath: 'studentNumber', category: 'education' },
  studentenommer: { fieldPath: 'studentNumber', category: 'education' },
  'student nommer': { fieldPath: 'studentNumber', category: 'education' },

  // ─── Signature ───────────────────────────────────────────────────
  signature: { fieldPath: '_signature', category: 'signature' },
  sign: { fieldPath: '_signature', category: 'signature' },
  'sign here': { fieldPath: '_signature', category: 'signature' },
  handtekening: { fieldPath: '_signature', category: 'signature' },
  teken: { fieldPath: '_signature', category: 'signature' },
  'teken hier': { fieldPath: '_signature', category: 'signature' },
  signed: { fieldPath: '_signature', category: 'signature' },
  'applicant signature': { fieldPath: '_signature', category: 'signature' },
  'client signature': { fieldPath: '_signature', category: 'signature' },

  // ─── Initials ────────────────────────────────────────────────────
  initial: { fieldPath: '_initial', category: 'signature' },
  initials: { fieldPath: '_initial', category: 'signature' },
  voorletters: { fieldPath: '_initial', category: 'signature' },
  'initial here': { fieldPath: '_initial', category: 'signature' },

  // ─── Date / Today ────────────────────────────────────────────────
  date: { fieldPath: '_date', category: 'date' },
  datum: { fieldPath: '_date', category: 'date' },
  today: { fieldPath: '_date', category: 'date' },
  'todays date': { fieldPath: '_date', category: 'date' },
  vandag: { fieldPath: '_date', category: 'date' },
  'vandag se datum': { fieldPath: '_date', category: 'date' },
  'signed date': { fieldPath: '_date', category: 'date' },
  'date signed': { fieldPath: '_date', category: 'date' },

  // ─── UIF / COIDA (SA-specific employment) ────────────────────────
  'uif number': { fieldPath: 'documents[uif_number].number', category: 'employment' },
  'uif no': { fieldPath: 'documents[uif_number].number', category: 'employment' },
  'uif nommer': { fieldPath: 'documents[uif_number].number', category: 'employment' },
  'coida number': { fieldPath: 'documents[coida].number', category: 'employment' },
  'coida no': { fieldPath: 'documents[coida].number', category: 'employment' },
  'compensation fund': { fieldPath: 'documents[coida].number', category: 'employment' },

  // ─── Vehicle Registration ────────────────────────────────────────
  'vehicle registration': {
    fieldPath: 'documents[vehicle_registration].number',
    category: 'identity',
  },
  'registration number': {
    fieldPath: 'documents[vehicle_registration].number',
    category: 'identity',
  },
  'reg number': { fieldPath: 'documents[vehicle_registration].number', category: 'identity' },
  'reg no': { fieldPath: 'documents[vehicle_registration].number', category: 'identity' },
  voertuigregistrasie: {
    fieldPath: 'documents[vehicle_registration].number',
    category: 'identity',
  },
  registrasienommer: { fieldPath: 'documents[vehicle_registration].number', category: 'identity' },

  // ─── Professional Registrations ──────────────────────────────────
  'registration body': { fieldPath: 'professionalRegistrations[0].body', category: 'professional' },
  'professional body': { fieldPath: 'professionalRegistrations[0].body', category: 'professional' },
  'registering body': { fieldPath: 'professionalRegistrations[0].body', category: 'professional' },
  'professionele liggaam': {
    fieldPath: 'professionalRegistrations[0].body',
    category: 'professional',
  },

  'professional registration number': {
    fieldPath: 'professionalRegistrations[0].registrationNumber',
    category: 'professional',
  },
  'registration no': {
    fieldPath: 'professionalRegistrations[0].registrationNumber',
    category: 'professional',
  },
  'practice number': {
    fieldPath: 'professionalRegistrations[0].registrationNumber',
    category: 'professional',
  },
  'practice no': {
    fieldPath: 'professionalRegistrations[0].registrationNumber',
    category: 'professional',
  },
  'hpcsa number': {
    fieldPath: 'professionalRegistrations[0].registrationNumber',
    category: 'professional',
  },
  'hpcsa no': {
    fieldPath: 'professionalRegistrations[0].registrationNumber',
    category: 'professional',
  },
  praktyknommer: {
    fieldPath: 'professionalRegistrations[0].registrationNumber',
    category: 'professional',
  },
  'praktyk nommer': {
    fieldPath: 'professionalRegistrations[0].registrationNumber',
    category: 'professional',
  },

  // ─── Birth Certificate ───────────────────────────────────────────
  'birth certificate': { fieldPath: 'documents[birth_certificate].number', category: 'identity' },
  'birth certificate number': {
    fieldPath: 'documents[birth_certificate].number',
    category: 'identity',
  },
  geboortesertifikaat: { fieldPath: 'documents[birth_certificate].number', category: 'identity' },

  // ─── Marriage Certificate ────────────────────────────────────────
  'marriage certificate': {
    fieldPath: 'documents[marriage_certificate].number',
    category: 'identity',
  },
  'marriage certificate number': {
    fieldPath: 'documents[marriage_certificate].number',
    category: 'identity',
  },
  huweliksertifikaat: { fieldPath: 'documents[marriage_certificate].number', category: 'identity' },

  // ─── Work Permit / Refugee ───────────────────────────────────────
  'work permit': { fieldPath: 'documents[work_permit].number', category: 'identity' },
  'work permit number': { fieldPath: 'documents[work_permit].number', category: 'identity' },
  werkpermit: { fieldPath: 'documents[work_permit].number', category: 'identity' },
  'werk permit': { fieldPath: 'documents[work_permit].number', category: 'identity' },
  'refugee permit': { fieldPath: 'documents[refugee_permit].number', category: 'identity' },
  'asylum seeker': { fieldPath: 'documents[asylum_seeker_permit].number', category: 'identity' },
  'asylum seeker permit': {
    fieldPath: 'documents[asylum_seeker_permit].number',
    category: 'identity',
  },
};

/**
 * Get the total number of entries in the dictionary.
 */
export function getDictionarySize(): number {
  return Object.keys(LABEL_DICTIONARY).length;
}

/**
 * Look up a normalized label in the dictionary.
 * Returns the entry if found, or undefined.
 */
export function lookupLabel(normalizedLabel: string): DictionaryEntry | undefined {
  if (!Object.hasOwn(LABEL_DICTIONARY, normalizedLabel)) {
    return undefined;
  }
  return LABEL_DICTIONARY[normalizedLabel];
}

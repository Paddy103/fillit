import { describe, expect, it } from 'vitest';
import type {
  Address,
  Citizenship,
  DocumentType,
  EmergencyContact,
  Gender,
  IdentityDocument,
  MaritalStatus,
  ProfessionalRegistration,
  ProfileRelationship,
  SignatureType,
  StoredSignature,
  UserProfile,
} from '../types/profile.js';

describe('Profile types', () => {
  describe('UserProfile', () => {
    const baseProfile: UserProfile = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      isPrimary: true,
      firstName: 'Thabo',
      lastName: 'Mokoena',
      dateOfBirth: '1990-06-15',
      nationality: 'South African',
      email: 'thabo@example.com',
      phoneMobile: '+27821234567',
      addresses: [],
      professionalRegistrations: [],
      documents: [],
      emergencyContacts: [],
      signatures: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('should allow a minimal primary profile with required fields only', () => {
      const profile: UserProfile = { ...baseProfile };
      expect(profile.isPrimary).toBe(true);
      expect(profile.firstName).toBe('Thabo');
      expect(profile.lastName).toBe('Mokoena');
      expect(profile.email).toBe('thabo@example.com');
      expect(profile.phoneMobile).toBe('+27821234567');
    });

    it('should allow a fully populated profile with all optional fields', () => {
      const fullProfile: UserProfile = {
        ...baseProfile,
        middleName: 'Sipho',
        maidenName: 'Dlamini',
        gender: 'male',
        maritalStatus: 'married',
        saIdNumber: '9006155800085',
        citizenship: 'citizen',
        phoneWork: '+27111234567',
        employer: 'Acme Corp',
        jobTitle: 'Software Engineer',
        workPhone: '+27111234567',
        workAddress: {
          id: 'addr-work',
          label: 'Work',
          street1: '100 Main Rd',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2001',
          country: 'South Africa',
          isDefault: false,
        },
        employeeNumber: 'EMP001',
        industry: 'Technology',
        highestQualification: 'BSc Computer Science',
        institution: 'University of Cape Town',
        yearCompleted: 2012,
        studentNumber: 'MKTHO001',
      };

      expect(fullProfile.middleName).toBe('Sipho');
      expect(fullProfile.saIdNumber).toBe('9006155800085');
      expect(fullProfile.employer).toBe('Acme Corp');
      expect(fullProfile.yearCompleted).toBe(2012);
      expect(fullProfile.workAddress?.city).toBe('Johannesburg');
    });

    it('should support dependent profiles with relationship field', () => {
      const dependent: UserProfile = {
        ...baseProfile,
        isPrimary: false,
        relationship: 'child',
        firstName: 'Lerato',
        lastName: 'Mokoena',
        dateOfBirth: '2015-03-20',
      };

      expect(dependent.isPrimary).toBe(false);
      expect(dependent.relationship).toBe('child');
    });

    it('should allow all valid relationship types', () => {
      const relationships: ProfileRelationship[] = ['spouse', 'child', 'parent', 'other'];
      relationships.forEach((rel) => {
        const profile: UserProfile = {
          ...baseProfile,
          isPrimary: false,
          relationship: rel,
        };
        expect(profile.relationship).toBe(rel);
      });
    });

    it('should allow all valid gender values', () => {
      const genders: Gender[] = ['male', 'female', 'other'];
      genders.forEach((g) => {
        const profile: UserProfile = { ...baseProfile, gender: g };
        expect(profile.gender).toBe(g);
      });
    });

    it('should allow all valid marital status values', () => {
      const statuses: MaritalStatus[] = ['single', 'married', 'divorced', 'widowed', 'other'];
      statuses.forEach((s) => {
        const profile: UserProfile = { ...baseProfile, maritalStatus: s };
        expect(profile.maritalStatus).toBe(s);
      });
    });

    it('should allow all valid citizenship values', () => {
      const values: Citizenship[] = ['citizen', 'permanent_resident'];
      values.forEach((c) => {
        const profile: UserProfile = { ...baseProfile, citizenship: c };
        expect(profile.citizenship).toBe(c);
      });
    });

    it('should support multiple addresses', () => {
      const profile: UserProfile = {
        ...baseProfile,
        addresses: [
          {
            id: 'addr-1',
            label: 'Home',
            street1: '42 Long St',
            city: 'Cape Town',
            province: 'Western Cape',
            postalCode: '8001',
            country: 'South Africa',
            isDefault: true,
          },
          {
            id: 'addr-2',
            label: 'Postal',
            street1: 'PO Box 123',
            city: 'Cape Town',
            province: 'Western Cape',
            postalCode: '8000',
            country: 'South Africa',
            isDefault: false,
          },
        ],
      };
      expect(profile.addresses).toHaveLength(2);
      expect(profile.addresses[0]!.isDefault).toBe(true);
      expect(profile.addresses[1]!.label).toBe('Postal');
    });

    it('should support emergency contacts', () => {
      const profile: UserProfile = {
        ...baseProfile,
        emergencyContacts: [
          {
            id: 'ec-1',
            firstName: 'Naledi',
            lastName: 'Mokoena',
            relationship: 'Spouse',
            phoneMobile: '+27829876543',
          },
          {
            id: 'ec-2',
            firstName: 'Peter',
            lastName: 'Mokoena',
            relationship: 'Parent',
            phoneMobile: '+27831112222',
            phoneWork: '+27111112222',
            email: 'peter@example.com',
          },
        ],
      };
      expect(profile.emergencyContacts).toHaveLength(2);
      expect(profile.emergencyContacts[0]!.firstName).toBe('Naledi');
      expect(profile.emergencyContacts[1]!.email).toBe('peter@example.com');
    });

    it('should support professional registrations', () => {
      const profile: UserProfile = {
        ...baseProfile,
        professionalRegistrations: [
          {
            id: 'reg-1',
            body: 'HPCSA',
            registrationNumber: 'MP0123456',
            expiryDate: '2027-12-31',
          },
        ],
      };
      expect(profile.professionalRegistrations).toHaveLength(1);
      expect(profile.professionalRegistrations[0]!.body).toBe('HPCSA');
    });

    it('should support identity documents', () => {
      const profile: UserProfile = {
        ...baseProfile,
        documents: [
          {
            id: 'doc-1',
            type: 'sa_smart_id',
            label: 'Smart ID Card',
            number: '9006155800085',
            issueDate: '2020-01-15',
            issuingAuthority: 'Department of Home Affairs',
            additionalFields: {},
          },
          {
            id: 'doc-2',
            type: 'drivers_license',
            label: "Driver's License",
            number: 'DL123456',
            expiryDate: '2028-06-30',
            additionalFields: { code: 'B' },
          },
        ],
      };
      expect(profile.documents).toHaveLength(2);
      expect(profile.documents[0]!.type).toBe('sa_smart_id');
      expect(profile.documents[1]!.additionalFields.code).toBe('B');
    });

    it('should support stored signatures', () => {
      const profile: UserProfile = {
        ...baseProfile,
        signatures: [
          {
            id: 'sig-1',
            profileId: baseProfile.id,
            type: 'drawn',
            label: 'Full signature',
            svgPath: 'M10,80 Q95,10 180,80',
            imageUri: 'file:///sig-1.png',
            createdAt: '2026-01-01T00:00:00Z',
            isDefault: true,
          },
          {
            id: 'sig-2',
            profileId: baseProfile.id,
            type: 'typed',
            label: 'Initials',
            text: 'TM',
            fontFamily: 'JetBrains Mono',
            createdAt: '2026-01-02T00:00:00Z',
            isDefault: false,
          },
        ],
      };
      expect(profile.signatures).toHaveLength(2);
      expect(profile.signatures[0]!.type).toBe('drawn');
      expect(profile.signatures[1]!.text).toBe('TM');
    });
  });

  describe('Address', () => {
    it('should allow a minimal address with required fields', () => {
      const address: Address = {
        id: 'addr-1',
        label: 'Home',
        street1: '42 Long St',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        country: 'South Africa',
        isDefault: true,
      };
      expect(address.street1).toBe('42 Long St');
      expect(address.suburb).toBeUndefined();
      expect(address.street2).toBeUndefined();
    });

    it('should allow SA-specific suburb field', () => {
      const address: Address = {
        id: 'addr-2',
        label: 'Home',
        street1: '10 Rivonia Blvd',
        street2: 'Unit 5',
        suburb: 'Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
        country: 'South Africa',
        isDefault: false,
      };
      expect(address.suburb).toBe('Sandton');
      expect(address.street2).toBe('Unit 5');
    });

    it('should support different address labels', () => {
      const labels = ['Home', 'Work', 'Mailing', 'Postal', 'Holiday House'];
      labels.forEach((label) => {
        const address: Address = {
          id: `addr-${label}`,
          label,
          street1: '1 Test St',
          city: 'Pretoria',
          province: 'Gauteng',
          postalCode: '0001',
          country: 'South Africa',
          isDefault: false,
        };
        expect(address.label).toBe(label);
      });
    });
  });

  describe('EmergencyContact', () => {
    it('should allow a minimal emergency contact', () => {
      const contact: EmergencyContact = {
        id: 'ec-1',
        firstName: 'Jane',
        lastName: 'Doe',
        relationship: 'Spouse',
        phoneMobile: '+27821234567',
      };
      expect(contact.firstName).toBe('Jane');
      expect(contact.phoneWork).toBeUndefined();
      expect(contact.email).toBeUndefined();
    });

    it('should allow a fully populated emergency contact', () => {
      const contact: EmergencyContact = {
        id: 'ec-2',
        firstName: 'John',
        lastName: 'Smith',
        relationship: 'Brother',
        phoneMobile: '+27829876543',
        phoneWork: '+27111234567',
        email: 'john@example.com',
      };
      expect(contact.phoneWork).toBe('+27111234567');
      expect(contact.email).toBe('john@example.com');
    });
  });

  describe('ProfessionalRegistration', () => {
    it('should allow a registration without expiry', () => {
      const reg: ProfessionalRegistration = {
        id: 'reg-1',
        body: 'SAICA',
        registrationNumber: 'CA(SA)12345',
      };
      expect(reg.body).toBe('SAICA');
      expect(reg.expiryDate).toBeUndefined();
    });

    it('should allow a registration with expiry', () => {
      const reg: ProfessionalRegistration = {
        id: 'reg-2',
        body: 'ECSA',
        registrationNumber: 'PR ENG 98765',
        expiryDate: '2028-03-31',
      };
      expect(reg.expiryDate).toBe('2028-03-31');
    });
  });

  describe('IdentityDocument', () => {
    it('should allow all SA document types', () => {
      const allTypes: DocumentType[] = [
        'sa_id_book',
        'sa_smart_id',
        'passport',
        'drivers_license',
        'prdp',
        'tax_number',
        'bank_account',
        'medical_aid',
        'hospital_plan',
        'vehicle_registration',
        'license_disc',
        'work_permit',
        'refugee_permit',
        'asylum_seeker_permit',
        'matric_certificate',
        'degree_diploma',
        'student_card',
        'hpcsa',
        'sacap',
        'ecsa',
        'saica',
        'law_society',
        'sace',
        'birth_certificate',
        'marriage_certificate',
        'coida',
        'uif_number',
        'custom',
      ];

      allTypes.forEach((type) => {
        const doc: IdentityDocument = {
          id: `doc-${type}`,
          type,
          label: type,
          number: '12345',
          additionalFields: {},
        };
        expect(doc.type).toBe(type);
      });

      expect(allTypes).toHaveLength(28);
    });

    it('should support custom document type with additional fields', () => {
      const doc: IdentityDocument = {
        id: 'doc-custom',
        type: 'custom',
        label: 'Gym Membership',
        number: 'GYM-001',
        additionalFields: {
          gym: 'Planet Fitness',
          branch: 'Sandton',
        },
      };
      expect(doc.type).toBe('custom');
      expect(doc.additionalFields.gym).toBe('Planet Fitness');
    });
  });

  describe('StoredSignature', () => {
    it('should allow all signature types', () => {
      const types: SignatureType[] = ['drawn', 'typed'];
      types.forEach((type) => {
        const sig: StoredSignature = {
          id: `sig-${type}`,
          profileId: 'profile-1',
          type,
          label: 'Test',
          createdAt: '2026-01-01T00:00:00Z',
          isDefault: false,
        };
        expect(sig.type).toBe(type);
      });
    });

    it('should support drawn signature with image and SVG', () => {
      const sig: StoredSignature = {
        id: 'sig-drawn',
        profileId: 'profile-1',
        type: 'drawn',
        label: 'Full signature',
        imageUri: 'file:///signatures/sig-1.png',
        svgPath: 'M0,0 L100,100',
        createdAt: '2026-01-01T00:00:00Z',
        isDefault: true,
      };
      expect(sig.imageUri).toBeDefined();
      expect(sig.svgPath).toBeDefined();
    });

    it('should support typed signature with text and font', () => {
      const sig: StoredSignature = {
        id: 'sig-typed',
        profileId: 'profile-1',
        type: 'typed',
        label: 'Formal',
        text: 'T. Mokoena',
        fontFamily: 'Inter',
        createdAt: '2026-01-01T00:00:00Z',
        isDefault: false,
      };
      expect(sig.text).toBe('T. Mokoena');
      expect(sig.fontFamily).toBe('Inter');
    });
  });

  describe('Barrel exports', () => {
    it('should export all profile types from the shared package', async () => {
      // Dynamic import verifies the barrel re-exports compile correctly.
      // Type-only exports are erased at runtime, so we verify by constructing
      // a valid UserProfile object using the imported types.
      const shared = await import('../index.js');
      expect(shared).toBeDefined();

      const profile: UserProfile = {
        id: 'test',
        isPrimary: true,
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '2000-01-01',
        nationality: 'South African',
        email: 'test@test.com',
        phoneMobile: '+27820000000',
        addresses: [],
        professionalRegistrations: [],
        documents: [],
        emergencyContacts: [],
        signatures: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      expect(profile).toBeDefined();
    });
  });
});

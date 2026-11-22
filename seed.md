# AHub Seed Credentials

These local test accounts are seeded for development and testing.

## Official roles (require MFA code: 123456)

### RAB Admin
- Email: rab.admin@ahub.test
- Password: RabAdmin@2026
- MFA: 123456

### NSG Admin
- Email: nsg.admin@ahub.test
- Password: NsgAdmin@2026
- MFA: 123456

### Province Veterinary Officer
- Email: province.vet@ahub.test
- Password: ProvinceVet@2026
- MFA: 123456

### District Veterinary Officer
- Email: district.vet@ahub.test
- Password: DistrictVet@2026
- MFA: 123456

### Sector Veterinary Officer
- Email: sector.vet@ahub.test
- Password: SectorVet@2026
- MFA: 123456

## Public roles

### Farmer
- Email: farmer.ahub@ahub.test
- Password: Farmer@2026

### Customer
- Email: customer.ahub@ahub.test
- Password: Customer@2026

## Re-seed command

```bash
npm --prefix backend run seed:users
```

## Notes
- Official portal logins require the MFA code `123456`.
- These accounts are intended for local testing only.
- MongoDB must be running locally before re-seeding.

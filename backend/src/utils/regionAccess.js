const value = (candidate) => String(candidate ?? '').trim().toLocaleLowerCase();

export const canAccessRegion = (user, record = {}) => {
  if (!user) return false;
  if (user.portal === 'rab') return true;

  const province = record.province ?? record.location?.province ?? '';
  const district = record.district ?? record.location?.district ?? '';
  const sector = record.sector ?? record.location?.sector ?? '';

  if (user.portal === 'province') {
    return Boolean(value(user.province)) && value(user.province) === value(province);
  }

  if (user.portal === 'district') {
    return Boolean(value(user.district)) &&
      value(user.district) === value(district) &&
      (!value(user.province) || value(user.province) === value(province));
  }

  if (user.portal === 'sector') {
    return Boolean(value(user.sector)) &&
      value(user.sector) === value(sector) &&
      (!value(user.district) || value(user.district) === value(district)) &&
      (!value(user.province) || value(user.province) === value(province));
  }

  return false;
};

export const buildRegionFilter = (user, prefix = '') => {
  const path = (field) => prefix ? `${prefix}.${field}` : field;
  if (!user) return { _id: null };
  if (user.portal === 'rab') return {};
  if (user.portal === 'province') return user.province ? { [path('province')]: user.province } : { _id: null };
  if (user.portal === 'district') {
    if (!user.district) return { _id: null };
    return {
      [path('district')]: user.district,
      ...(user.province ? { [path('province')]: user.province } : {}),
    };
  }
  if (user.portal === 'sector') {
    if (!user.sector) return { _id: null };
    return {
      [path('sector')]: user.sector,
      ...(user.district ? { [path('district')]: user.district } : {}),
      ...(user.province ? { [path('province')]: user.province } : {}),
    };
  }
  return { _id: null };
};

const prisma = require('../../client');

async function findAccountsByEmail(email) {
  return prisma.taiKhoan.findMany({
    where: {
      NguoiDung: {
        Email: email,
      },
    },
    include: {
      NguoiDung: true,
    },
    orderBy: {
      MaTaiKhoan: 'desc',
    },
  });
}

async function findAccountById(maTaiKhoan) {
  return prisma.taiKhoan.findUnique({
    where: {
      MaTaiKhoan: Number(maTaiKhoan),
    },
    include: {
      NguoiDung: true,
    },
  });
}

async function findAccountsByProviderId({ provider, providerId }) {
  return prisma.taiKhoan.findMany({
    where: {
      Provider: {
        equals: String(provider || ''),
        mode: 'insensitive',
      },
      providerId: String(providerId || ''),
    },
    include: {
      NguoiDung: true,
    },
    orderBy: {
      MaTaiKhoan: 'desc',
    },
  });
}

async function createUser({ email, matKhau, hoTen }) {
  return prisma.$transaction(async (tx) => {
    const displayName = String(hoTen || '').trim() || String(email).split('@')[0];
    const nguoiDung = await tx.nguoiDung.create({
      data: {
        HoTen: displayName,
        Email: email,
        Role: 'CUSTOMER',
      },
    });

    const taiKhoan = await tx.taiKhoan.create({
      data: {
        MaNguoiDung: nguoiDung.MaNguoiDung,
        MatKhau: matKhau,
        Provider: 'local',
        IsActived: false,
        TrangThai: 'Active',
      },
    });

    return {
      taiKhoan,
      nguoiDung,
    };
  });
}

async function createPendingLocalAccountForUser({ maNguoiDung, matKhau }) {
  return prisma.taiKhoan.create({
    data: {
      MaNguoiDung: Number(maNguoiDung),
      MatKhau: matKhau,
      Provider: 'local',
      IsActived: false,
      TrangThai: 'Active',
    },
    include: {
      NguoiDung: true,
    },
  });
}

async function createGoogleAccountForUser({ maNguoiDung, providerId, matKhau }) {
  return prisma.taiKhoan.create({
    data: {
      MaNguoiDung: Number(maNguoiDung),
      MatKhau: String(matKhau || ''),
      Provider: 'google',
      providerId: String(providerId || ''),
      IsActived: true,
      TrangThai: 'Active',
    },
    include: {
      NguoiDung: true,
    },
  });
}

async function createUserWithGoogle({ email, hoTen, providerId, matKhau }) {
  return prisma.$transaction(async (tx) => {
    const displayName = String(hoTen || '').trim() || String(email).split('@')[0];

    const nguoiDung = await tx.nguoiDung.create({
      data: {
        HoTen: displayName,
        Email: email,
        Role: 'CUSTOMER',
      },
    });

    const taiKhoan = await tx.taiKhoan.create({
      data: {
        MaNguoiDung: nguoiDung.MaNguoiDung,
        MatKhau: String(matKhau || ''),
        Provider: 'google',
        providerId: String(providerId || ''),
        IsActived: true,
        TrangThai: 'Active',
      },
    });

    return {
      taiKhoan,
      nguoiDung,
    };
  });
}

async function activateAccount(maTaiKhoan) {
  return prisma.taiKhoan.update({
    where: {
      MaTaiKhoan: Number(maTaiKhoan),
    },
    data: {
      IsActived: true,
      TrangThai: 'Active',
    },
    include: {
      NguoiDung: true,
    },
  });
}

async function deletePendingLocalAccountsByUser({ maNguoiDung, exceptMaTaiKhoan }) {
  const userId = Number(maNguoiDung);
  if (!Number.isFinite(userId)) {
    return { count: 0 };
  }

  const where = {
    MaNguoiDung: userId,
    Provider: {
      equals: 'local',
      mode: 'insensitive',
    },
    IsActived: false,
  };

  if (exceptMaTaiKhoan !== undefined && exceptMaTaiKhoan !== null) {
    where.MaTaiKhoan = {
      not: Number(exceptMaTaiKhoan),
    };
  }

  return prisma.taiKhoan.deleteMany({ where });
}

module.exports = {
  findAccountsByEmail,
  findAccountById,
  findAccountsByProviderId,
  createUser,
  createPendingLocalAccountForUser,
  createGoogleAccountForUser,
  createUserWithGoogle,
  activateAccount,
  deletePendingLocalAccountsByUser,
};

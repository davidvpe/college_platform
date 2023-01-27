import { Schema, model, ObjectId, ValidateFn } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const test: ValidateFn<string> = (val) => {
  return val.length > 0;
};
export interface IUser {
  _id?: ObjectId;
  name: string;
  lastName: string;
  email: string;
  career: string;
  semester: number;
  photo: string;
  role: string;
  password: string;
  passwordConfirm: string | undefined;
  active: boolean;
  passwordChangedAt: Date;
  passwordResetToken: String | undefined;
  passwordResetExpires: Date | undefined;
  isModified: (path: string) => boolean;
  correctPassword: (inputPassword: string, userPassword: string) => Promise<boolean>;
  createPasswordResetToken: () => string;
  changedPasswordAfter: (JWTTimestamp: number) => boolean;
  find: (filter: any) => Promise<IUser[]>;
  hashToken: (token: string) => string;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Nombre es requerido'],
  },
  lastName: {
    type: String,
    required: [true, 'Apellido es requerido'],
  },
  email: {
    type: String,
    required: [true, 'Email es requerido'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email inválido'],
  },
  career: {
    type: String,
  },
  semester: {
    type: Number,
  },
  photo: {
    type: String,
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student',
  },
  password: {
    type: String,
    required: [true, 'Contraseña es requerida'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Confirmación de contraseña es requerida'],
    validate: {
      validator: function (el: string) {
        // @ts-ignore
        return el === this.password;
      } as ValidateFn<string>,
      message: 'Las contraseñas no coinciden',
    },
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function (inputPassword: string, userPassword: string) {
  return await bcrypt.compare(inputPassword, userPassword);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp: number) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt((this.passwordChangedAt.getTime() / 1000) as any, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.pre<IUser>(/find^/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

export const hashToken = function (tokenPath: string) {
  return crypto.createHash('sha256').update(tokenPath).digest('hex');
};

const User = model<IUser>('User', userSchema);

export default User;

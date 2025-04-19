import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/userModel';
import ActiveTokens from '../models/ActiveTokensModel';
import nodemailer from 'nodemailer';

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

const generateTokens = (userId: string, email: string) => {
  const accessToken = jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, jwtRefreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

 export const register = async (req: Request, res: Response) => {
  const { name, email, password, address, pincode, mobileNumber } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ name }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Name Or Email Already Exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      address,
      mobileNumber,
      pincode,
    });

    await newUser.save();

    const { accessToken, refreshToken } = generateTokens(
      newUser._id.toString(),
      email,
    );

    await ActiveTokens.create({ email, accessToken, refreshToken });

    res
      .status(201)
      .json({
        message: 'User Registered Successfully',
        accessToken,
        refreshToken,
      });
  } catch (error) {
    console.error('Error Registering User:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid Email Or Password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid Email Or Password' });
    }

    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      email,
    );

    await ActiveTokens.create({ email, accessToken, refreshToken });

    res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Error Logging In:', error);
    res.status(500).json({ error: 'Failed To Login' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User Not Found' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const resetPasswordToken = token;
    const resetPasswordExpires = new Date(Date.now() + 3600000);

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      to: email,
      from: process.env.EMAIL_USERNAME,
      subject: 'Password Reset',
      text:
        `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n` +
        `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
        `http://${req.headers.host}/api/reset-password/${resetPasswordToken}\n\n` +
        `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error('Error Sending Password Reset Email:', err);
        return res
          .status(500)
          .json({ error: 'Failed To Send Password Reset Email' });
      }
      res.status(200).json({ message: 'Password Reset Email Sent' });
    });
  } catch (error) {
    console.error('Error Sending Password Reset Token:', error);
    res.status(500).json({ error: 'Failed To Send Password Reset Token' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Token And New Password Are Required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid Or Expired Token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password Reset Successfully' });
  } catch (error) {
    console.error('Error Resetting Password:', error);
    res.status(500).json({ error: 'Failed To Reset Password' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Authorization Header Missing Or Invalid' });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    const activeToken = await ActiveTokens.findOneAndDelete({ accessToken });

    if (!activeToken) {
      return res
        .status(400)
        .json({ message: 'Invalid Or Expired Access Token' });
    }

    res.status(200).json({ message: 'Logged Out Successfully' });
  } catch (error) {
    console.error('Error Logging Out:', error);
    res.status(500).json({ error: 'Failed To Logout' });
  }
};

import { zodResolver } from "@hookform/resolvers/zod";
import { type UserLoginInput, userLoginInput } from "@launchmin/shared";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type KeyboardEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { login } from "../api/auth";
import { useAuthStore } from "../stores/auth";

const MESH_LIGHT = [
	"radial-gradient(at 15% 20%, rgb(var(--mui-palette-primary-mainChannel) / 0.08) 0px, transparent 50%)",
	"radial-gradient(at 85% 25%, rgb(var(--mui-palette-secondary-mainChannel) / 0.06) 0px, transparent 50%)",
	"radial-gradient(at 50% 90%, rgb(var(--mui-palette-info-mainChannel) / 0.08) 0px, transparent 50%)",
].join(", ");

const MESH_DARK = [
	"radial-gradient(at 15% 20%, rgb(var(--mui-palette-primary-mainChannel) / 0.18) 0px, transparent 50%)",
	"radial-gradient(at 85% 25%, rgb(var(--mui-palette-secondary-mainChannel) / 0.12) 0px, transparent 50%)",
	"radial-gradient(at 50% 90%, rgb(var(--mui-palette-info-mainChannel) / 0.15) 0px, transparent 50%)",
].join(", ");

// 1px hairline + soft alpha-blended box-shadow on focus instead of MUI's
// default 2px primary outline. Reads as "deliberately designed".
const focusRingSx = {
	"& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
		borderWidth: "1px",
		borderColor: "primary.main",
	},
	"& .MuiOutlinedInput-root.Mui-focused": {
		boxShadow: "0 0 0 3px rgb(var(--mui-palette-primary-mainChannel) / 0.16)",
	},
};

function SignInPage() {
	const { t } = useTranslation("auth");
	const navigate = useNavigate();
	const setTokens = useAuthStore((s) => s.setTokens);
	const [showPassword, setShowPassword] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [capsLockOn, setCapsLockOn] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<UserLoginInput>({
		resolver: zodResolver(userLoginInput),
		// "onTouched" validates after the first blur and then on every change
		// (vs "onBlur" which never re-validates as you fix the error). RHF's
		// reValidateMode only applies after submit, so it can't replace this.
		mode: "onTouched",
	});

	const onSubmit = handleSubmit(async (data) => {
		setServerError(null);
		try {
			const session = await login(data);
			setTokens(session.accessToken, session.expiresIn);
			navigate("/dashboard", { replace: true });
		} catch {
			setServerError(t("signIn.errorGeneric"));
		}
	});

	const onPasswordKey = (e: KeyboardEvent<HTMLInputElement>) => {
		setCapsLockOn(e.getModifierState("CapsLock"));
	};

	const passwordHelper =
		errors.password?.message ??
		(capsLockOn ? t("signIn.capsLockOn") : undefined);
	const passwordHelperIsWarning = capsLockOn && !errors.password;

	return (
		<Box
			sx={(theme) => ({
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "background.default",
				backgroundImage: MESH_LIGHT,
				p: { xs: 3, md: 4 },
				...theme.applyStyles("dark", {
					backgroundImage: MESH_DARK,
				}),
			})}
		>
			<Card
				variant="outlined"
				sx={(theme) => ({
					width: "100%",
					maxWidth: 440,
					borderRadius: 2,
					boxShadow:
						"0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -8px rgba(15, 23, 42, 0.08)",
					...theme.applyStyles("dark", {
						boxShadow:
							"0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -8px rgba(0, 0, 0, 0.6)",
					}),
				})}
			>
				<CardContent sx={{ p: { xs: 3, sm: 5 } }}>
					<Stack spacing={4}>
						<Stack spacing={3}>
							<Stack spacing={1.5}>
								<Box
									component="img"
									src="/logo.svg"
									alt=""
									sx={{ width: 48, height: 48 }}
								/>
								<Typography
									variant="h6"
									fontWeight={600}
									sx={{ letterSpacing: "-0.01em" }}
								>
									Launchmin
								</Typography>
							</Stack>
							<Stack spacing={0.5}>
								<Typography variant="h4" fontWeight={600}>
									{t("signIn.title")}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{t("signIn.subtitle")}
								</Typography>
							</Stack>
						</Stack>

						<Stack component="form" spacing={3} onSubmit={onSubmit} noValidate>
							<Stack spacing={2}>
								{serverError && (
									<Alert severity="error" onClose={() => setServerError(null)}>
										{serverError}
									</Alert>
								)}

								<TextField
									label={t("signIn.accountLabel")}
									fullWidth
									autoComplete="username"
									autoFocus
									error={!!errors.account}
									helperText={errors.account?.message}
									sx={focusRingSx}
									{...register("account")}
								/>
								<TextField
									label={t("signIn.passwordLabel")}
									type={showPassword ? "text" : "password"}
									fullWidth
									autoComplete="current-password"
									error={!!errors.password}
									helperText={passwordHelper}
									sx={focusRingSx}
									{...register("password")}
									onKeyDown={onPasswordKey}
									onKeyUp={onPasswordKey}
									slotProps={{
										input: {
											endAdornment: (
												<InputAdornment position="end">
													<IconButton
														aria-label={
															showPassword
																? t("signIn.hidePassword")
																: t("signIn.showPassword")
														}
														onClick={() => setShowPassword((v) => !v)}
														edge="end"
														size="small"
													>
														{showPassword ? (
															<VisibilityOffOutlinedIcon fontSize="small" />
														) : (
															<VisibilityOutlinedIcon fontSize="small" />
														)}
													</IconButton>
												</InputAdornment>
											),
										},
										formHelperText: passwordHelperIsWarning
											? { sx: { color: "warning.main" } }
											: undefined,
									}}
								/>
							</Stack>
							<Button
								type="submit"
								variant="contained"
								size="large"
								fullWidth
								disabled={isSubmitting}
								startIcon={
									isSubmitting ? (
										<CircularProgress size={16} color="inherit" />
									) : undefined
								}
								sx={(theme) => ({
									transition: theme.transitions.create(
										["transform", "box-shadow"],
										{ duration: theme.transitions.duration.short },
									),
									"&:hover": { transform: "translateY(-1px)" },
									"&:active": { transform: "translateY(0)" },
								})}
							>
								{isSubmitting ? t("signIn.submitting") : t("signIn.submit")}
							</Button>
						</Stack>

						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ textAlign: "center", display: "block" }}
						>
							{t("signIn.adminContact")}
						</Typography>
					</Stack>
				</CardContent>
			</Card>
		</Box>
	);
}

export default SignInPage;

$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinCredReader {
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern void CredFree(IntPtr credentialPtr);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static string ReadCredUtf8(string target) {
        IntPtr credPtr;
        if (CredRead(target, 1, 0, out credPtr)) {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
            CredFree(credPtr);
            return Encoding.UTF8.GetString(bytes);
        }
        return null;
    }
}
'@

Add-Type -TypeDefinition $code -Language CSharp
$token = [WinCredReader]::ReadCredUtf8("LegacyGeneric:target=GitHub - https://api.github.com/GKHarjithadithyha")

if (-not $token) {
    Write-Error "Could not retrieve GitHub credential from Windows Credential Manager."
    exit 1
}

$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;$env:Path"
$env:GITHUB_TOKEN = $token
node "$PSScriptRoot\push-to-github.cjs"

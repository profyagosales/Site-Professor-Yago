export default function LoginProfessorDebug() {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      color: 'black',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <h1>DEBUG: Login Professor</h1>
      <p>Se você está vendo isso, o problema NÃO é o roteamento.</p>
      <p>O problema está no componente LoginProfessor original.</p>
    </div>
  );
}

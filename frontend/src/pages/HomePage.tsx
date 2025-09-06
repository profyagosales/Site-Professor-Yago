import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'

export function HomePage() {
  return (
    <div className="home-container">
      <h1>Bem-vindo ao Portal do Professor Yago Sales</h1>
      <div className="login-options">
        <Link to={paths.loginAluno} className="login-button">
          Entrar como Aluno
        </Link>
        <Link to={paths.loginProfessor} className="login-button">
          Entrar como Professor
        </Link>
      </div>
    </div>
  )
}

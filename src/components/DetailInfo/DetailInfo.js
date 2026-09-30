import { ENVS } from "../../helpers/configurations"
import emeraldImg from "../../assets/img/emerald.png"
import rubyImg from "../../assets/img/ruby.png"
import diamondImg from "../../assets/img/diamond.png"
import arrowImg from "../../assets/img/arrow_up.svg"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "./DetailInfo.css"

export const DetailInfo = (props) => {
  const data = props.data
  const id = props.id

  const [loading, setLoading] = useState(true)
  const [upgradable, setUpgradable] = useState(false)
  const [tierString, setTierString] = useState("")
  const [tierImg, setTierImg] = useState("")

  const navigate = useNavigate()

  useEffect(() => {
    setLoading(false)

    if (data.voteCount < ENVS.DIAMOND_TIRE_LIMIT) {
      setUpgradable(true)
    }

    if (data.voteCount >= ENVS.DIAMOND_TIRE_LIMIT) {
      setTierString("Diamond Tier ")
      setTierImg(diamondImg)
    } else if (data.voteCount >= ENVS.RUBY_TIRE_LIMIT) {
      setTierString("Ruby Tier")
      setTierImg(rubyImg)
    } else {
      setTierString("Emerald Tier")
      setTierImg(emeraldImg)
    }
  }, [loading, data.voteCount])

  const upgradeClicked = (data) => {
    navigate("/tiers/", { state: { info: data, id: id } })
  }
  return (
    <div className="detailInfoDiv">
      <div className="detailInfoWrappedDiv">
        <div className="detailInfoTitleDiv">Coin Information</div>
        <div className="detailInfoContentDiv">
          KYC&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;{data.kyc}
        </div>
        <div className="detailInfoContentDiv">
          Audit&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&nbsp;{data.audit}
        </div>
        <div className="detailInfoContentTierDiv">
          Tier&emsp;&emsp;&emsp;&emsp;
          <div className="tierInfoDivWrapped">
            <div className="tierInfoDiv">
              {tierString}&nbsp;
              <img src={tierImg} alt="" />
            </div>

            {upgradable === true ? (
              <div className="upgradeTierDiv" onClick={() => upgradeClicked(data)}>
                {upgradable}
                upgrade <img src={arrowImg} alt="" />
              </div>
            ) : (
              <div></div>
            )}
          </div>
        </div>
        <div className="detailInfoContentDiv">
          Votes&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;{data.voteCount}
        </div>
        <div className="detailInfoContentDiv">
          Votes Today&emsp;&emsp;&emsp;&emsp;&nbsp;&nbsp;{data.dailyCount}
        </div>
      </div>
    </div>
  )
}

export default DetailInfo
